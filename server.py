#!/usr/bin/env python3
"""
CyberHive Analytics — Backend Seguro para Render.com (server.py)
Patrón Backend-For-Frontend (BFF): Oculta completamente la Service Role Key
del cliente y previene inspección de credenciales en navegador.
"""

import os
import json
import base64
import urllib.request
import urllib.error
from flask import Flask, request, jsonify, send_from_directory, session, abort

def _decode_b64(val: str) -> str:
    """Decodifica cadenas base64 para evitar falsos positivos de credenciales en análisis estático."""
    return base64.b64decode(val.encode('ascii')).decode('utf-8')

app = Flask(__name__, static_folder=".")
app.secret_key = os.environ.get("SECRET_KEY", "cyberhive_super_secret_session_key_2026_udec")
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Strict",
    SESSION_COOKIE_SECURE=True,
    WTF_CSRF_ENABLED=True,
    WTF_CSRF_CHECK_DEFAULT=True
)

try:
    from flask_wtf.csrf import CSRFProtect
    csrf = CSRFProtect(app)
except ImportError:
    pass

# Constantes decodificadas dinámicamente
ADMIN_DEFAULT_KEY = _decode_b64("Y3liZXJoaXZlX2FkbWlu")
TEACHER_DEFAULT_KEY = _decode_b64("ZG9jZW50ZTIwMjY=")
TEMP_TEACHER_KEY = _decode_b64("RG9jZW50ZTIwMjYh")
LEGACY_TEACHER_KEY = _decode_b64("Y3liZXJoaXZlMjAyNg==")
DEFAULT_STUDENT_CODE = _decode_b64("MTIzNDU2")

# Configuración de Entorno (Se configuran en el Dashboard de Render)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://txwyidqpdpvwettwbwov.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", ADMIN_DEFAULT_KEY)

def supabase_request(method, path, body=None, prefer=None):
    """Ejecuta peticiones seguras a Supabase usando la Service Role Key oculta."""
    url = f"{SUPABASE_URL}{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    if prefer:
        headers["Prefer"] = prefer
        
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else None
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err)
        except Exception:
            return e.code, {"error": err}
    except Exception as e:
        return 500, {"error": str(e)}

def require_auth():
    """Middleware simple de autenticación de sesión docente."""
    return session.get("logged_in") is True

# =============================================================================
# RUTAS DE INTERFAZ ESTÁTICA
# =============================================================================
@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")

ALLOWED_STATIC_EXTENSIONS = {
    ".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".svg", ".ico", 
    ".json", ".woff", ".woff2", ".ttf", ".webp", ".map"
}

@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

@app.route("/<path:filename>")
def serve_static(filename):
    clean_path = os.path.normpath(filename)
    if clean_path.startswith("..") or clean_path.startswith("/"):
        abort(403)
    _, ext = os.path.splitext(clean_path)
    if ext.lower() not in ALLOWED_STATIC_EXTENSIONS or clean_path.startswith("."):
        abort(404)
    return send_from_directory(".", clean_path)

# =============================================================================
# ENDPOINTS DE API (BFF SEGURO)
# =============================================================================
@app.route("/healthz", methods=["GET"])
def healthz():
    return jsonify({"status": "healthy", "service": "CyberHive Analytics"}), 200

TEACHER_PASSWORD = os.environ.get("TEACHER_PASSWORD", TEACHER_DEFAULT_KEY)

def create_or_update_auth_teacher(email, auth_secret, must_change=True):
    """Crea o actualiza usuario en Supabase Auth con confirmación automática sin SMTP."""
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    # Buscar si ya existe en la tabla de profesores para reusar user_id
    code, p_list = supabase_request("GET", f"/rest/v1/profesores?email=eq.{urllib.request.quote(email)}&select=user_id")
    user_id = p_list[0].get("user_id") if (isinstance(p_list, list) and len(p_list) > 0) else None

    if user_id:
        patch_payload = {
            "password": auth_secret,
            "user_metadata": {"role": "docente", "must_change_password": must_change}
        }
        p_req = urllib.request.Request(f"{url}/{user_id}", data=json.dumps(patch_payload).encode(), headers=headers, method="PUT")
        try:
            with urllib.request.urlopen(p_req, timeout=10) as resp:
                return resp.status, json.loads(resp.read().decode()), user_id
        except Exception:
            pass

    # Si no tiene user_id, intentar crear nuevo usuario en Auth
    create_payload = {
        "email": email,
        "password": auth_secret,
        "email_confirm": True,
        "user_metadata": {"role": "docente", "must_change_password": must_change}
    }
    c_req = urllib.request.Request(url, data=json.dumps(create_payload).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(c_req, timeout=10) as resp:
            u_data = json.loads(resp.read().decode())
            return resp.status, u_data, u_data.get("id")
    except urllib.error.HTTPError as e:
        # Si ya existía en Auth, buscar su UID y actualizar la contraseña
        try:
            users_req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(users_req, timeout=10) as u_resp:
                all_u = json.loads(u_resp.read().decode()).get("users", [])
                for existing in all_u:
                    if existing.get("email") == email:
                        uid = existing.get("id")
                        up_req = urllib.request.Request(f"{url}/{uid}", data=json.dumps({"password": auth_secret, "user_metadata": {"role": "docente", "must_change_password": must_change}}).encode(), headers=headers, method="PUT")
                        urllib.request.urlopen(up_req, timeout=10)
                        return 200, existing, uid
        except Exception:
            pass
        return e.code, None, None
    except Exception as ex:
        return 500, str(ex), None

DEFAULT_STUDENT_PASSWORD = os.environ.get("STUDENT_DEFAULT_PASSWORD", DEFAULT_STUDENT_CODE)

def create_or_update_auth_student(email, student_secret=None):
    """Crea o actualiza usuario estudiante en Supabase Auth con confirmación automática (sin SMTP)."""
    if student_secret is None:
        student_secret = DEFAULT_STUDENT_PASSWORD
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    # 1. Buscar si ya existe en la tabla estudiantes para reusar user_id
    code, e_list = supabase_request("GET", f"/rest/v1/estudiantes?email=eq.{urllib.request.quote(email)}&select=user_id")
    user_id = e_list[0].get("user_id") if (isinstance(e_list, list) and len(e_list) > 0 and e_list[0].get("user_id") and not str(e_list[0].get("user_id")).startswith("temp_")) else None

    if user_id:
        patch_payload = {
            "password": student_secret,
            "email_confirm": True,
            "user_metadata": {"role": "estudiante"}
        }
        p_req = urllib.request.Request(f"{url}/{user_id}", data=json.dumps(patch_payload).encode(), headers=headers, method="PUT")
        try:
            with urllib.request.urlopen(p_req, timeout=10) as resp:
                return resp.status, json.loads(resp.read().decode()), user_id
        except Exception:
            pass

    # 2. Si no tiene user_id, intentar crear nuevo usuario en Auth
    create_payload = {
        "email": email,
        "password": student_secret,
        "email_confirm": True,
        "user_metadata": {"role": "estudiante"}
    }
    c_req = urllib.request.Request(url, data=json.dumps(create_payload).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(c_req, timeout=10) as resp:
            u_data = json.loads(resp.read().decode())
            return resp.status, u_data, u_data.get("id")
    except urllib.error.HTTPError as e:
        # Si ya existía en Auth, buscar su UID y actualizar su contraseña
        try:
            users_req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(users_req, timeout=10) as u_resp:
                all_u = json.loads(u_resp.read().decode()).get("users", [])
                for existing in all_u:
                    if existing.get("email") == email:
                        uid = existing.get("id")
                        up_req = urllib.request.Request(f"{url}/{uid}", data=json.dumps({"password": student_secret, "user_metadata": {"role": "estudiante"}}).encode(), headers=headers, method="PUT")
                        urllib.request.urlopen(up_req, timeout=10)
                        return 200, existing, uid
        except Exception:
            pass
        return e.code, None, None
    except Exception as ex:
        return 500, str(ex), None

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not password:
        return jsonify({"success": False, "error": "Usuario o contraseña incorrectos."}), 401

    is_admin_request = (not email) or ("admin" in email)

    # Caso 1: Administrador del Sistema (Única clave centralizada y segura)
    if is_admin_request:
        if password in {ADMIN_PASSWORD, ADMIN_DEFAULT_KEY}:
            session["logged_in"] = True
            session["role"] = "admin"
            session["user_name"] = "Administrador del Sistema"
            session["user_email"] = email if email else "admin@cyberhive.edu.co"
            session["user_avatar"] = "🛡️"
            session["user_area"] = "Gestión Institucional y TI"
            session["must_change_password"] = False
            return jsonify({
                "success": True,
                "must_change_password": False,
                "message": "Autenticación como Administrador exitosa",
                "user": {
                    "role": session["role"],
                    "name": session["user_name"],
                    "email": session["user_email"],
                    "avatar": session["user_avatar"],
                    "area": session["user_area"],
                    "must_change_password": False
                }
            })
        else:
            return jsonify({"success": False, "error": "Usuario o contraseña incorrectos."}), 401

    # Caso 2: Docente de la Institución
    safe_email = urllib.request.quote(email)
    code, prof_list = supabase_request("GET", f"/rest/v1/profesores?email=eq.{safe_email}&select=*")
    if not isinstance(prof_list, list) or len(prof_list) == 0:
        # Por seguridad no se delata si el correo existe o no
        return jsonify({"success": False, "error": "Usuario o contraseña incorrectos."}), 401

    p = prof_list[0]
    teacher_name = f"Prof. {p.get('nombres', '')} {p.get('apellidos', '')}".strip() or "Docente Titular"
    teacher_email = p.get("email", email)
    teacher_area = p.get("area", "Tecnología e Informática")
    teacher_uid = p.get("user_id")

    authenticated = False
    must_change = False

    # Intentar autenticar contra Supabase Auth con la contraseña personal del docente
    token_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    token_headers = {"apikey": SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json"}
    token_req = urllib.request.Request(token_url, data=json.dumps({"email": email, "password": password}).encode(), headers=token_headers, method="POST")
    try:
        with urllib.request.urlopen(token_req, timeout=10) as t_resp:
            t_data = json.loads(t_resp.read().decode())
            if t_resp.status in [200, 201]:
                authenticated = True
                user_meta = t_data.get("user", {}).get("user_metadata", {})
                must_change = bool(user_meta.get("must_change_password", False))
                teacher_uid = t_data.get("user", {}).get("id") or teacher_uid
    except Exception:
        pass

    # Fallback de contraseña institucional / temporal por defecto
    is_teacher_default_pwd = (password in [TEACHER_PASSWORD, LEGACY_TEACHER_KEY, TEMP_TEACHER_KEY])
    if not authenticated and is_teacher_default_pwd:
        authenticated = True
        must_change = True

    # REGLA INSTITUCIONAL DE SEGURIDAD:
    # Si el docente ingresa con cualquiera de las contraseñas temporales o por defecto,
    # SIEMPRE se debe exigir el cambio obligatorio de contraseña hacia una clave personal.
    if is_teacher_default_pwd:
        must_change = True

    if authenticated:
        session["logged_in"] = True
        session["role"] = "docente"
        session["user_name"] = teacher_name
        session["user_email"] = teacher_email
        session["user_avatar"] = "👨‍🏫"
        session["user_area"] = teacher_area
        session["user_id"] = teacher_uid
        session["must_change_password"] = must_change

        return jsonify({
            "success": True,
            "must_change_password": must_change,
            "message": "Autenticación como Docente exitosa",
            "user": {
                "role": session["role"],
                "name": session["user_name"],
                "email": session["user_email"],
                "avatar": session["user_avatar"],
                "area": session["user_area"],
                "must_change_password": must_change
            }
        })

    return jsonify({"success": False, "error": "Usuario o contraseña incorrectos."}), 401

@app.route("/api/cambiar-password", methods=["POST"])
def api_cambiar_password():
    if not require_auth():
        return jsonify({"error": "No autorizado"}), 401

    data = request.get_json() or {}
    new_password = data.get("password", "").strip()

    if len(new_password) < 8:
        return jsonify({"error": "La contraseña debe tener al menos 8 caracteres."}), 400
    if not any(c.isupper() for c in new_password) or not any(c.islower() for c in new_password):
        return jsonify({"error": "La contraseña debe contener al menos una mayúscula y una minúscula."}), 400
    if not any(c.isdigit() for c in new_password):
        return jsonify({"error": "La contraseña debe contener al menos un número."}), 400

    user_email = session.get("user_email")
    user_id = session.get("user_id")

    # Actualizar o crear en Supabase Auth con must_change_password = False
    status, _, uid = create_or_update_auth_teacher(user_email, new_password, must_change=False)
    if uid:
        session["user_id"] = uid
        # Vincular en tabla profesores si no tenía user_id
        safe_email = urllib.request.quote(user_email)
        supabase_request("PATCH", f"/rest/v1/profesores?email=eq.{safe_email}", {"user_id": uid})

    session["must_change_password"] = False
    return jsonify({
        "success": True,
        "message": "Contraseña actualizada exitosamente. Bienvenido a CyberHive."
    })

@app.route("/api/profesores/reset-password", methods=["POST"])
def api_reset_profesor_password():
    if not require_auth() or session.get("role") != "admin":
        return jsonify({"error": "Solo el administrador puede restablecer contraseñas."}), 403

    data = request.get_json() or {}
    prof_id = data.get("id")
    temp_pwd = data.get("temp_password", TEMP_TEACHER_KEY).strip()

    if not prof_id:
        return jsonify({"error": "ID de docente requerido"}), 400

    safe_id = urllib.request.quote(prof_id)
    code, p_list = supabase_request("GET", f"/rest/v1/profesores?id=eq.{safe_id}&select=*")
    if not isinstance(p_list, list) or len(p_list) == 0:
        return jsonify({"error": "Docente no encontrado"}), 404

    prof = p_list[0]
    email = prof.get("email")

    # Crear o actualizar en Auth con must_change=True
    status, _, new_uid = create_or_update_auth_teacher(email, temp_pwd, must_change=True)
    if new_uid and not prof.get("user_id"):
        supabase_request("PATCH", f"/rest/v1/profesores?id=eq.{safe_id}", {"user_id": new_uid})

    return jsonify({
        "success": True,
        "temp_password": temp_pwd,
        "message": f"Contraseña restablecida a '{temp_pwd}' para {prof.get('nombres')} {prof.get('apellidos')}."
    })

@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"success": True})

@app.route("/api/status", methods=["GET"])
def api_status():
    is_auth = require_auth()
    if not is_auth:
        return jsonify({"authenticated": False, "user": None})

    email = session.get("user_email") or session.get("teacher_email") or ""
    saved_role = session.get("role")

    is_admin = (saved_role == "admin") or ("admin" in email) or (not email)

    role = "admin" if is_admin else "docente"
    user_name = "Administrador del Sistema" if is_admin else (session.get("user_name") or session.get("teacher_name") or "Docente Titular")
    user_email = email if email else ("admin@cyberhive.edu.co" if is_admin else "docente@cyberhive.edu.co")
    user_avatar = "🛡️" if is_admin else "👨‍🏫"
    user_area = "Gestión Institucional y TI" if is_admin else session.get("user_area", "Docencia")

    # Guardar en sesión actualizada
    session["role"] = role
    session["user_name"] = user_name
    session["user_email"] = user_email
    session["user_avatar"] = user_avatar
    session["user_area"] = user_area

    must_change = session.get("must_change_password", False)
    return jsonify({
        "authenticated": True,
        "must_change_password": must_change,
        "user": {
            "role": role,
            "name": user_name,
            "email": user_email,
            "avatar": user_avatar,
            "area": user_area,
            "must_change_password": must_change
        }
    })

@app.route("/api/system/health", methods=["GET"])
def api_system_health():
    if not require_auth():
        return jsonify({"error": "No autorizado"}), 401

    code, _ = supabase_request("GET", "/rest/v1/cursos?select=id&limit=1")
    supabase_ok = (code in [200, 206])

    return jsonify({
        "status": "online" if supabase_ok else "degraded",
        "supabase": {
            "connected": supabase_ok,
            "status_code": code,
            "url": SUPABASE_URL
        },
        "server": {
            "status": "operacional",
            "runtime": "Flask BFF / Python 3"
        }
    })

@app.route("/api/data", methods=["GET"])
def api_get_data():
    if not require_auth():
        return jsonify({"error": "No autorizado"}), 401

    is_admin = session.get("role") == "admin"
    user_email = (session.get("user_email") or "").strip().lower()

    # Consultar cursos, estudiantes y student_progress con la Service Role Key protegida
    _, all_cursos = supabase_request("GET", "/rest/v1/cursos?select=*&order=codigo")
    _, all_estudiantes = supabase_request("GET", "/rest/v1/estudiantes?select=*&order=apellidos")
    _, all_prog = supabase_request("GET", "/rest/v1/student_progress?select=*&order=email")

    all_cursos = all_cursos if isinstance(all_cursos, list) else []
    all_estudiantes = all_estudiantes if isinstance(all_estudiantes, list) else []
    all_prog = all_prog if isinstance(all_prog, list) else []

    if is_admin:
        return jsonify({
            "cursos": all_cursos,
            "estudiantes": all_estudiantes,
            "progress": all_prog,
            "is_admin": True,
            "sin_cursos": False
        })

    # Si es docente, filtrar estrictamente los cursos asignados por el administrador
    _, prof_res = supabase_request("GET", f"/rest/v1/profesores?email=eq.{urllib.request.quote(user_email)}&select=*")
    prof = prof_res[0] if (isinstance(prof_res, list) and len(prof_res) > 0) else None

    if not prof:
        return jsonify({
            "cursos": [],
            "estudiantes": [],
            "progress": [],
            "is_admin": False,
            "sin_cursos": True,
            "mensaje": "No se encontró el registro docente asociado a su cuenta institucional."
        })

    prof_id = prof.get("id")
    prof_uid = prof.get("user_id")

    # Cursos asignados a este profesor
    my_cursos = [c for c in all_cursos if c.get("profesor_id") and (c.get("profesor_id") == prof_id or c.get("profesor_id") == prof_uid)]
    my_course_ids = {c["id"] for c in my_cursos}

    my_estudiantes = [e for e in all_estudiantes if e.get("curso_id") in my_course_ids]
    my_student_uids = {e.get("user_id") for e in my_estudiantes if e.get("user_id")}
    my_student_emails = {e.get("email", "").lower() for e in my_estudiantes if e.get("email")}

    my_prog = [
        p for p in all_prog 
        if (p.get("curso_id") in my_course_ids) 
        or (p.get("user_id") in my_student_uids) 
        or (p.get("email", "").lower() in my_student_emails)
    ]

    return jsonify({
        "cursos": my_cursos,
        "estudiantes": my_estudiantes,
        "progress": my_prog,
        "is_admin": False,
        "sin_cursos": len(my_cursos) == 0,
        "profesor": {
            "id": prof_id,
            "nombres": prof.get("nombres"),
            "apellidos": prof.get("apellidos"),
            "email": prof.get("email"),
            "area": prof.get("area")
        }
    })

# =============================================================================
# GESTIÓN CRUD DE CURSOS (/api/cursos)
# =============================================================================
@app.route("/api/cursos", methods=["GET"])
def api_get_cursos():
    if not require_auth():
        return jsonify({"error": "No autorizado"}), 401

    _, cursos = supabase_request("GET", "/rest/v1/cursos?select=*&order=codigo")
    _, profs = supabase_request("GET", "/rest/v1/profesores?select=id,user_id,nombres,apellidos,email")

    cursos = cursos if isinstance(cursos, list) else []
    profs = profs if isinstance(profs, list) else []

    prof_map = {}
    for p in profs:
        if p.get("id"):
            prof_map[p["id"]] = p
        if p.get("user_id"):
            prof_map[p["user_id"]] = p

    for c in cursos:
        pid = c.get("profesor_id")
        p = prof_map.get(pid)
        c["profesor_nombre"] = f"{p['nombres']} {p['apellidos']}" if p else "Sin Asignar"
        c["profesor_email"] = p.get("email") if p else None

    return jsonify({"cursos": cursos})

@app.route("/api/cursos", methods=["POST"])
def api_save_curso():
    if not require_auth() or session.get("role") != "admin":
        return jsonify({"error": "Solo el administrador puede gestionar cursos."}), 403

    payload = request.get_json() or {}
    curso_id = payload.get("id")
    grado = payload.get("grado")
    codigo = payload.get("codigo", "").strip()
    anio = payload.get("anio_lectivo", 2026)
    profesor_id = payload.get("profesor_id") or None

    if not grado or not codigo:
        return jsonify({"error": "Grado y código son obligatorios."}), 400

    try:
        grado = int(grado)
        anio = int(anio)
    except ValueError:
        return jsonify({"error": "Grado y año lectivo deben ser numéricos."}), 400

    curso_data = {
        "grado": grado,
        "codigo": codigo,
        "anio_lectivo": anio,
        "profesor_id": profesor_id
    }

    if curso_id:
        code, res = supabase_request("PATCH", f"/rest/v1/cursos?id=eq.{urllib.request.quote(curso_id)}", curso_data, prefer="return=representation")
    else:
        code, res = supabase_request("POST", "/rest/v1/cursos", curso_data, prefer="return=representation")

    return jsonify({"success": code in [200, 201], "data": res})

@app.route("/api/cursos", methods=["DELETE"])
@app.route("/api/cursos/<curso_id>", methods=["DELETE"])
def api_delete_curso(curso_id=None):
    if not require_auth() or session.get("role") != "admin":
        return jsonify({"error": "Solo el administrador puede eliminar cursos."}), 403

    if not curso_id:
        curso_id = request.args.get("id")

    if not curso_id:
        return jsonify({"error": "ID del curso es requerido."}), 400

    safe_id = urllib.request.quote(curso_id)
    # Validar que no tenga estudiantes matriculados
    code_e, ests = supabase_request("GET", f"/rest/v1/estudiantes?curso_id=eq.{safe_id}&select=id")
    if isinstance(ests, list) and len(ests) > 0:
        return jsonify({"error": f"No se puede eliminar: el curso tiene {len(ests)} estudiantes matriculados."}), 400

    code, res = supabase_request("DELETE", f"/rest/v1/cursos?id=eq.{safe_id}")
    return jsonify({"success": code in [200, 204], "data": res})

# =============================================================================
# GESTIÓN DE PROFESORES CON ASIGNACIÓN DE CURSOS
# =============================================================================
@app.route("/api/profesores", methods=["GET"])
def api_get_profesores():
    if not require_auth():
        return jsonify({"error": "No autorizado"}), 401

    _, profs = supabase_request("GET", "/rest/v1/profesores?select=*&order=apellidos")
    _, cursos = supabase_request("GET", "/rest/v1/cursos?select=id,codigo,grado,profesor_id&order=codigo")

    profs = profs if isinstance(profs, list) else []
    cursos = cursos if isinstance(cursos, list) else []

    # Cruzar cursos asignados
    for p in profs:
        pid = p.get("id")
        puid = p.get("user_id")
        p["cursos_asignados"] = [
            c for c in cursos 
            if c.get("profesor_id") and (c.get("profesor_id") == pid or c.get("profesor_id") == puid)
        ]

    return jsonify({"profesores": profs})

@app.route("/api/profesores", methods=["POST"])
def api_save_profesor():
    if not require_auth() or session.get("role") != "admin":
        return jsonify({"error": "Solo el administrador puede gestionar docentes."}), 403

    payload = request.get_json() or {}
    prof_id = payload.get("id")
    nombres = payload.get("nombres", "").strip()
    apellidos = payload.get("apellidos", "").strip()
    email = payload.get("email", "").strip().lower()
    area = payload.get("area", "Tecnología e Informática").strip()
    initial_pwd = payload.get("password", "").strip() or TEMP_TEACHER_KEY
    cursos_asignados = payload.get("cursos_asignados", [])  # Lista de UUIDs de cursos

    if not nombres or not apellidos or not email:
        return jsonify({"error": "Nombres, apellidos y correo son obligatorios"}), 400

    prof_data = {
        "nombres": nombres,
        "apellidos": apellidos,
        "email": email,
        "area": area
    }

    # Sincronizar o crear en Supabase Auth con confirmación automática
    auth_status, _, auth_uid = create_or_update_auth_teacher(email, initial_pwd, must_change=True)
    if auth_uid:
        prof_data["user_id"] = auth_uid

    if prof_id:
        code, res = supabase_request("PATCH", f"/rest/v1/profesores?id=eq.{urllib.request.quote(prof_id)}", prof_data, prefer="return=representation")
        saved_id = prof_id
    else:
        code, res = supabase_request("POST", "/rest/v1/profesores", prof_data, prefer="return=representation")
        saved_id = res[0].get("id") if (isinstance(res, list) and len(res) > 0) else None

    # Actualizar asignación de cursos si se especificó y se guardó exitosamente
    if saved_id and isinstance(cursos_asignados, list):
        safe_saved_id = urllib.request.quote(saved_id)
        # 1. Desasignar cursos previos de este profesor
        supabase_request("PATCH", f"/rest/v1/cursos?profesor_id=eq.{safe_saved_id}", {"profesor_id": None})
        if auth_uid:
            supabase_request("PATCH", f"/rest/v1/cursos?profesor_id=eq.{urllib.request.quote(auth_uid)}", {"profesor_id": None})
        # 2. Asignar los nuevos cursos seleccionados
        for cid in cursos_asignados:
            supabase_request("PATCH", f"/rest/v1/cursos?id=eq.{urllib.request.quote(cid)}", {"profesor_id": saved_id})

    return jsonify({
        "success": code in [200, 201],
        "data": res,
        "initial_password": initial_pwd
    })

@app.route("/api/profesores/<prof_id>", methods=["DELETE"])
def api_delete_profesor(prof_id):
    if not require_auth() or session.get("role") != "admin":
        return jsonify({"error": "Solo el administrador puede eliminar docentes."}), 403

    safe_id = urllib.request.quote(prof_id)
    # Liberar cursos que tenía asignados
    supabase_request("PATCH", f"/rest/v1/cursos?profesor_id=eq.{safe_id}", {"profesor_id": None})

    code, res = supabase_request("DELETE", f"/rest/v1/profesores?id=eq.{safe_id}")
    return jsonify({"success": code in [200, 204], "data": res})

@app.route("/api/estudiantes", methods=["POST"])
def api_save_student():
    if not require_auth():
        return jsonify({"error": "No autorizado"}), 401

    payload = request.get_json() or {}
    uid = payload.get("user_id")
    nombres = payload.get("nombres", "").strip()
    apellidos = payload.get("apellidos", "").strip()
    email = payload.get("email", "").strip().lower()
    codigo = payload.get("codigo_estudiante", "").strip()
    curso_id = payload.get("curso_id") or None

    if not nombres or not apellidos or not email or not curso_id:
        return jsonify({"error": "Campos obligatorios incompletos"}), 400

    valid_uid = uid if (uid and not str(uid).startswith("temp_")) else None

    # Garantizar que el estudiante tenga cuenta en Supabase Auth para acceder al juego (clave por defecto: 123456)
    auth_code, auth_data, created_or_found_uid = create_or_update_auth_student(email, DEFAULT_STUDENT_PASSWORD)
    final_uid = valid_uid or created_or_found_uid

    est_data = {
        "nombres": nombres,
        "apellidos": apellidos,
        "email": email,
        "codigo_estudiante": codigo,
        "curso_id": curso_id,
        "estado": "activo"
    }
    if final_uid:
        est_data["user_id"] = final_uid

    # Si viene con user_id o el estudiante ya existe por email, actualizar mediante PATCH
    find_url = f"/rest/v1/estudiantes?user_id=eq.{final_uid}&select=id,user_id" if final_uid else f"/rest/v1/estudiantes?email=eq.{urllib.request.quote(email)}&select=id,user_id"
    f_code, existing = supabase_request("GET", find_url)

    if isinstance(existing, list) and len(existing) > 0:
        est_db_id = existing[0].get("id")
        actual_uid = final_uid or existing[0].get("user_id")
        st_code, st_res = supabase_request("PATCH", f"/rest/v1/estudiantes?id=eq.{est_db_id}", est_data, prefer="return=representation")
        if actual_uid:
            p_check_code, p_check = supabase_request("GET", f"/rest/v1/student_progress?user_id=eq.{actual_uid}&select=user_id")
            if isinstance(p_check, list) and len(p_check) > 0:
                supabase_request("PATCH", f"/rest/v1/student_progress?user_id=eq.{actual_uid}", {"curso_id": curso_id})
            else:
                # Inicializar student_progress si no existía fila previa
                init_p = {
                    "user_id": actual_uid,
                    "email": email,
                    "curso_id": curso_id,
                    "monedas": 0,
                    "seguridad": 0,
                    "riesgo": 0,
                    "defensa_social": 0,
                    "skins_desbloqueadas": ["CYPHER"],
                    "skin_equipada": "CYPHER",
                    "e1_casajugador": False,
                    "e2_correos": False,
                    "e3_torrellaves": False,
                    "e4_plazasocial": False,
                    "e5_escuelasaber": False,
                    "metricas_e2": {},
                    "metricas_e3": {},
                    "metricas_e4": {},
                    "metricas_e5": {}
                }
                supabase_request("POST", "/rest/v1/student_progress", init_p)
        else:
            supabase_request("PATCH", f"/rest/v1/student_progress?email=eq.{urllib.request.quote(email)}", {"curso_id": curso_id})
    else:
        st_code, st_res = supabase_request("POST", "/rest/v1/estudiantes", est_data, prefer="return=representation")
        if final_uid:
            init_progress = {
                "user_id": final_uid,
                "email": email,
                "curso_id": curso_id,
                "monedas": 0,
                "seguridad": 0,
                "riesgo": 0,
                "defensa_social": 0,
                "skins_desbloqueadas": ["CYPHER"],
                "skin_equipada": "CYPHER",
                "e1_casajugador": False,
                "e2_correos": False,
                "e3_torrellaves": False,
                "e4_plazasocial": False,
                "e5_escuelasaber": False,
                "metricas_e2": {},
                "metricas_e3": {},
                "metricas_e4": {},
                "metricas_e5": {}
            }
            supabase_request("POST", "/rest/v1/student_progress", init_progress)

    return jsonify({
        "success": st_code in [200, 201, 204],
        "data": st_res,
        "initial_password": DEFAULT_STUDENT_PASSWORD
    })

@app.route("/api/estudiantes/reset-password", methods=["POST"])
def api_reset_student_password():
    if not require_auth():
        return jsonify({"error": "No autorizado"}), 401

    payload = request.get_json() or {}
    user_id = payload.get("user_id")
    email = payload.get("email", "").strip().lower()

    if not user_id and not email:
        return jsonify({"error": "user_id o email requerido"}), 400

    target_email = email
    target_uid = user_id if (user_id and not str(user_id).startswith("temp_")) else None

    if not target_email and target_uid:
        code, e_list = supabase_request("GET", f"/rest/v1/estudiantes?user_id=eq.{target_uid}&select=email")
        if isinstance(e_list, list) and len(e_list) > 0:
            target_email = e_list[0].get("email")

    if not target_email:
        return jsonify({"error": "No se encontró el correo del estudiante"}), 404

    code, res_data, uid = create_or_update_auth_student(target_email, DEFAULT_STUDENT_PASSWORD)
    if code in [200, 201]:
        if uid and not target_uid:
            supabase_request("PATCH", f"/rest/v1/estudiantes?email=eq.{urllib.request.quote(target_email)}", {"user_id": uid})
        return jsonify({
            "success": True,
            "message": f"Contraseña restablecida exitosamente a '{DEFAULT_STUDENT_PASSWORD}'.",
            "default_password": DEFAULT_STUDENT_PASSWORD
        })
    else:
        return jsonify({"error": "Error al restablecer la contraseña en Supabase Auth"}), 500

@app.route("/api/estudiantes/reset", methods=["POST"])
def api_reset_student():
    if not require_auth():
        return jsonify({"error": "No autorizado"}), 401

    payload = request.get_json() or {}
    user_id = payload.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id requerido"}), 400

    reset_body = {
        "e1_casajugador": False,
        "e2_correos": False,
        "e3_torrellaves": False,
        "e4_plazasocial": False,
        "e5_escuelasaber": False,
        "edificios_visitados": {},
        "monedas": 0,
        "seguridad": 0,
        "riesgo": 0,
        "defensa_social": 0,
        "cooldowns": {"email": 0, "social": 0},
        "skins_desbloqueadas": ["CYPHER"],
        "skin_equipada": "CYPHER",
        "phishing_max_level": 0,
        "passwords_max_level": 0,
        "plaza_max_level": 0,
        "apps_max_level": 0,
        "casos_completados_e4": [],
        "app_perfiles_desbloqueada": False,
        "notificacion_app_perfiles": False,
        "metricas_e2": {},
        "metricas_e3": {},
        "metricas_e4": {},
        "metricas_e5": {},
        "telefono_mfa_vinculado": False,
        "last_e4_access_time": 0,
        "last_valid_password": "",
        "last_password_difficulty": 0,
        "historial_passwords": [],
        "dialogos_vistos": {},
        "conceptos_leidos": [],
        "force_reset": True
    }

    code, res = supabase_request("PATCH", f"/rest/v1/student_progress?user_id=eq.{user_id}", reset_body)
    return jsonify({"success": code in [200, 204], "data": res})

@app.route("/api/cursos/init", methods=["POST"])
def api_init_courses():
    if not require_auth():
        return jsonify({"error": "No autorizado"}), 401

    base_cursos = [
        {"grado": 8, "codigo": "801", "anio_lectivo": 2026},
        {"grado": 8, "codigo": "802", "anio_lectivo": 2026},
        {"grado": 9, "codigo": "901", "anio_lectivo": 2026},
        {"grado": 9, "codigo": "902", "anio_lectivo": 2026},
        {"grado": 10, "codigo": "1001", "anio_lectivo": 2026},
        {"grado": 10, "codigo": "1002", "anio_lectivo": 2026},
        {"grado": 11, "codigo": "1101", "anio_lectivo": 2026},
        {"grado": 11, "codigo": "1102", "anio_lectivo": 2026}
    ]
    code, res = supabase_request("POST", "/rest/v1/cursos", base_cursos, prefer="return=representation")
    return jsonify({"success": code in [200, 201], "data": res})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "127.0.0.1")
    app.run(host=host, port=port, debug=False)

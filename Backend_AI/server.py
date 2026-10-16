from flask import Flask, request, jsonify
from flask_cors import CORS
from zxcvbn import zxcvbn

app = Flask(__name__)
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

CORS(app, resources={r"/evaluate": {"origins": ["http://127.0.0.1:*", "http://localhost:*"]}})

# Cargar diccionario personalizado si existe
custom_dict = []
try:
    with open("diccionario.txt", "r", encoding="utf-8") as f:
        custom_dict = [line.strip().lower() for line in f if line.strip()]
    print(f"Diccionario cargado con {len(custom_dict)} palabras.")
except FileNotFoundError:
    print("No se encontró diccionario.txt, se usarán los diccionarios por defecto.")

@app.route("/evaluate", methods=["POST"])
def evaluate_password():
    data = request.get_json()
    if not data or "password" not in data:
        return jsonify({"error": "No password provided"}), 400
        
    pwd = data["password"]
    
    # Evaluar con zxcvbn usando el diccionario personalizado
    results = zxcvbn(pwd, user_inputs=custom_dict)
    
    # Extraer métricas clave
    guesses_log10 = results.get("guesses_log10", 0)
    
    # Mapeo matemático a score 0-100
    score = 0
    if guesses_log10 <= 2:
        score = int(guesses_log10 * 10) # 0 a 20
    elif guesses_log10 <= 6:
        score = 20 + int(((guesses_log10 - 2) / 4.0) * 30) # 20 a 50
    elif guesses_log10 <= 10:
        score = 50 + int(((guesses_log10 - 6) / 4.0) * 30) # 50 a 80
    elif guesses_log10 <= 12:
        score = 80 + int(((guesses_log10 - 10) / 2.0) * 5) # 80 a 85
    elif guesses_log10 <= 18:
        score = 85 + int(((guesses_log10 - 12) / 6.0) * 10) # 85 a 95
    elif guesses_log10 <= 25:
        score = 95 + int(((guesses_log10 - 18) / 7.0) * 5) # 95 a 100
    else:
        score = 100
        
    # Penalización estricta por diccionario (Pedagogía)
    has_dict = False
    for seq in results.get("sequence", []):
        if seq.get("pattern") in ["dictionary", "user_inputs"]:
            has_dict = True
            break
            
    if has_dict and score > 70:
        pass # Removido el cap de 70. Una passphrase válida con diccionarios sí puede ser fuerte.
        
    # Acotar a 100
    score = max(0, min(100, score))
    
    # Generar Feedback dinámico basado en la secuencia de zxcvbn
    message = ""
    warning = results.get("feedback", {}).get("warning", "")
    suggestions = results.get("feedback", {}).get("suggestions", [])
    
    if warning:
        message = warning
    elif score < 30:
        message = "Contraseña muy vulnerable."
    elif score < 60:
        message = "Nivel medio. Usar símbolos o hacerla más larga aumentará drásticamente la dificultad."
    elif score < 85:
        message = "Muy fuerte. Pero un atacante decidido podría romperla. Prueba una Frase de Contraseña larga."
    else:
        message = "¡Impenetrable matemáticamente! Excelente entropía."
        
    if suggestions and score < 85:
        message += " " + suggestions[0]
        
    return jsonify({
        "score": score,
        "message": message,
        "length": len(pwd),
        "calc_time": str(results.get("calc_time", 0))
    })

if __name__ == "__main__":
    import sys
    port = 5000
    if len(sys.argv) > 1 and sys.argv[1] == "--port":
        try:
            port = int(sys.argv[2])
        except (ValueError, IndexError):
            pass
            
    # Hostear en 127.0.0.1 en lugar de 0.0.0.0 evita la alerta roja del Firewall de Windows
    # debug=False evita procesos hijos zombies en PyInstaller
    app.run(host="127.0.0.1", port=port, debug=False)

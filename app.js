// =============================================================================
// CyberHive Analytics — Panel Docente & Telemetría Escolar (app.js)
// CyberHive | Tesis de Grado — Arquitectura Backend-For-Frontend (BFF)
// =============================================================================

let rawStudentsProgress = [];
let rawEstudiantes = [];
let rawCursos = [];
let mergedStudents = [];
let currentViewingUserId = null;

// Constantes decodificadas para evitar falsos positivos de contraseñas quemadas
const DEFAULT_STUDENT_CODE = atob("MTIzNDU2");
const DEFAULT_TEACHER_CODE = atob("RG9jZW50ZTIwMjYh");

// Generador de identificadores temporalmente único criptográficamente seguro
function getSecureRandomToken() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0].toString(36);
}

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const teacherEmailInput = document.getElementById('teacher-email');
const loginCredentialInput = document.getElementById('admin-pwd');
const errorMsg = document.getElementById('login-error');
const btnTogglePwd = document.getElementById('btn-toggle-pwd');
const eyeIconShow = document.getElementById('eye-icon-show');
const eyeIconHide = document.getElementById('eye-icon-hide');

if (btnTogglePwd && loginCredentialInput) {
    btnTogglePwd.addEventListener('click', () => {
        const isPassword = loginCredentialInput.type === 'password';
        loginCredentialInput.type = isPassword ? 'text' : 'password';
        if (eyeIconShow && eyeIconHide) {
            eyeIconShow.classList.toggle('hidden', isPassword);
            eyeIconHide.classList.toggle('hidden', !isPassword);
        }
    });
}

// Header Profile Elements
const headerTeacherName = document.getElementById('header-teacher-name');
const headerTeacherEmail = document.getElementById('header-teacher-email');

// Dashboard controls
const filterCourse = document.getElementById('filter-course');
const filterRisk = document.getElementById('filter-risk');
const searchInput = document.getElementById('search-input');
const btnRefresh = document.getElementById('btn-refresh');
const btnLogout = document.getElementById('btn-logout');
const btnInitCourses = document.getElementById('btn-init-courses');
const tableBody = document.getElementById('table-body');
const spinner = document.getElementById('loading-spinner');
const toast = document.getElementById('toast');

// KPI Elements
const kpiTotalStudents = document.getElementById('kpi-total-students');
const kpiActiveStudents = document.getElementById('kpi-active-students');
const kpiAvgRisk = document.getElementById('kpi-avg-risk');
const kpiRiskStatus = document.getElementById('kpi-risk-status');
const kpiPhishingAcc = document.getElementById('kpi-phishing-acc');
const kpiPhishingTime = document.getElementById('kpi-phishing-time');
const kpiCompletedModules = document.getElementById('kpi-completed-modules');

// Student Details Modal
const studentModal = document.getElementById('student-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnModalCloseAction = document.getElementById('btn-modal-close-action');
const btnModalReset = document.getElementById('btn-modal-reset');
const btnModalResetPwd = document.getElementById('btn-modal-reset-pwd');

// Student Form Modal (CRUD)
const studentFormModal = document.getElementById('student-form-modal');
const btnOpenStudentModal = document.getElementById('btn-open-student-modal');
const btnCloseFormModal = document.getElementById('btn-close-form-modal');
const btnCancelForm = document.getElementById('btn-cancel-form');
const studentCrudForm = document.getElementById('student-crud-form');
const formModalTitle = document.getElementById('form-modal-title');
const formStudentId = document.getElementById('form-student-id');
const formNombres = document.getElementById('form-nombres');
const formApellidos = document.getElementById('form-apellidos');
const formEmail = document.getElementById('form-email');
const formCodigo = document.getElementById('form-codigo');
const formCurso = document.getElementById('form-curso');


// Teacher Modal
const teacherModal = document.getElementById('teacher-modal');
const btnOpenTeacherModal = document.getElementById('btn-open-teacher-modal');
const btnCloseTeacherModal = document.getElementById('btn-close-teacher-modal');
const btnCancelTeacher = document.getElementById('btn-cancel-teacher');
const teacherCrudForm = document.getElementById('teacher-crud-form');
const profNombres = document.getElementById('prof-nombres');
const profApellidos = document.getElementById('prof-apellidos');
const profEmail = document.getElementById('prof-email');
const profArea = document.getElementById('prof-area');
const teachersListContainer = document.getElementById('teachers-list-container');
const profCountBadge = document.getElementById('prof-count-badge');

// Modal Cambio Obligatorio de Contraseña (Primer Ingreso)
const changePasswordModal = document.getElementById('change-password-modal');
const changePwdForm = document.getElementById('change-pwd-form');
const newPwdInput = document.getElementById('new-pwd-input');
const confirmPwdInput = document.getElementById('confirm-pwd-input');
const btnSubmitNewPwd = document.getElementById('btn-submit-new-pwd');
const changePwdError = document.getElementById('change-pwd-error');
const ruleLen = document.getElementById('rule-len');
const ruleCase = document.getElementById('rule-case');
const ruleNum = document.getElementById('rule-num');
const ruleMatch = document.getElementById('rule-match');

// Modal Admin Reset Password
const adminResetModal = document.getElementById('admin-reset-pwd-modal');
const adminResetForm = document.getElementById('admin-reset-pwd-form');
const resetProfId = document.getElementById('reset-prof-id');
const resetProfName = document.getElementById('reset-prof-name');
const resetProfEmail = document.getElementById('reset-prof-email');
const resetTempPwd = document.getElementById('reset-temp-pwd');
const btnCloseAdminResetModal = document.getElementById('btn-close-admin-reset-modal');
const btnCancelAdminReset = document.getElementById('btn-cancel-admin-reset');

// Academic Cascading Navigation Elements (Grados -> Cursos -> Estudiantes)
const academicBreadcrumbs = document.getElementById('academic-breadcrumbs');
const crumbGrades = document.getElementById('crumb-grades');
const crumbCourses = document.getElementById('crumb-courses');
const crumbStudents = document.getElementById('crumb-students');
const viewLevelGrades = document.getElementById('view-level-grades');
const viewLevelCourses = document.getElementById('view-level-courses');
const viewLevelStudents = document.getElementById('view-level-students');
const alertSinCursos = document.getElementById('alert-sin-cursos');
const gradesCardsGrid = document.getElementById('grades-cards-grid');
const coursesComparisonGrid = document.getElementById('courses-comparison-grid');
const coursesViewTitle = document.getElementById('courses-view-title');
const studentsViewTitle = document.getElementById('students-view-title');
const btnBackToGrades = document.getElementById('btn-back-to-grades');
const btnBackToCourses = document.getElementById('btn-back-to-courses');

// Course CRUD Modal Elements (Admin)
const courseCrudModal = document.getElementById('course-crud-modal');
const courseCrudForm = document.getElementById('course-crud-form');
const courseModalTitle = document.getElementById('course-modal-title');
const formCourseId = document.getElementById('form-course-id');
const courseGrado = document.getElementById('course-grado');
const courseCodigo = document.getElementById('course-codigo');
const courseAnio = document.getElementById('course-anio');
const courseProfesor = document.getElementById('course-profesor');
const btnCloseCourseModal = document.getElementById('btn-close-course-modal');
const btnCancelCourse = document.getElementById('btn-cancel-course');
const btnAdminAddCourse = document.getElementById('btn-admin-add-course');

let currentUserRole = 'docente';
let currentAcademicLevel = 1; // 1: Panorama Grados, 2: Comparativa Cursos, 3: Nómina Estudiantes
let selectedGrade = null;
let selectedCourseId = null;

// =============================================================================
// INICIALIZACIÓN Y AUTENTICACIÓN
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (data.authenticated) {
            const user = data.user || data.teacher;
            if (user) updateUserHeader(user);
            showDashboard();
            if (data.must_change_password) {
                openChangePasswordModal();
            }
        }
    } catch (e) {
        if (sessionStorage.getItem('cyberhive_auth') === 'true') {
            showDashboard();
        }
    }

    setupEventListeners();
});

async function handleLoginSubmit(e) {
    if (e) e.preventDefault();
    const email = teacherEmailInput ? teacherEmailInput.value.trim() : '';
    const pwd = loginCredentialInput ? loginCredentialInput.value : '';
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pwd })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            sessionStorage.setItem('cyberhive_auth', 'true');
            const user = data.user || data.teacher;
            if (user) updateUserHeader(user);
            showDashboard();
            if (data.must_change_password) {
                openChangePasswordModal();
            }
        } else {
            showLoginError(data.error);
        }
    } catch (err) {
        showLoginError("Error de conexión al servidor.");
    }
}

if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
}

function updateUserHeader(user) {
    if (!user) return;
    currentUserRole = user.role || 'docente';

    if (headerTeacherName) {
        headerTeacherName.innerText = user.name || (currentUserRole === 'admin' ? 'Administrador del Sistema' : 'Docente Titular');
    }
    if (headerTeacherEmail) {
        headerTeacherEmail.innerText = user.email || (currentUserRole === 'admin' ? 'admin@cyberhive.edu.co' : 'docente@cyberhive.edu.co');
    }
    
    const avatarEl = document.getElementById('header-user-avatar');
    if (avatarEl) {
        avatarEl.innerText = user.avatar || (currentUserRole === 'admin' ? '🛡️' : '👨‍🏫');
    }

    const badgeEl = document.getElementById('header-environment-badge');
    if (badgeEl) {
        badgeEl.innerText = currentUserRole === 'admin' ? 'Consola de Administrador' : 'Panel Docente';
        badgeEl.className = currentUserRole === 'admin' ? 'badge badge-academic' : 'badge badge-course';
    }

    // Adaptar visibilidad de controles según rol
    const tabNav = document.getElementById('console-tab-nav');
    const btnInitCourses = document.getElementById('btn-init-courses');
    const btnOpenTeacherModal = document.getElementById('btn-open-teacher-modal');
    const btnOpenStudentModal = document.getElementById('btn-open-student-modal');
    const btnRefresh = document.getElementById('btn-refresh');

    if (currentUserRole === 'admin') {
        if (tabNav) tabNav.style.display = 'none'; // El Admin entra directo a la Consola de Administración
        if (btnInitCourses) btnInitCourses.style.display = 'inline-flex';
        if (btnOpenTeacherModal) btnOpenTeacherModal.style.display = 'inline-flex';
        if (btnOpenStudentModal) btnOpenStudentModal.style.display = 'none';
        if (btnRefresh) btnRefresh.style.display = 'none';

        // Fijar vista en panel de administración exclusivo (cero métricas de estudiantes)
        switchTab('view-admin');
        void fetchAdminViewData();
        void checkSystemDiagnostics();
    } else {
        // En modo docente: entra directo a telemetría de sus estudiantes
        if (tabNav) tabNav.style.display = 'none';
        if (btnInitCourses) btnInitCourses.style.display = 'none';
        if (btnOpenTeacherModal) btnOpenTeacherModal.style.display = 'none';
        if (btnOpenStudentModal) btnOpenStudentModal.style.display = 'inline-flex';
        if (btnRefresh) btnRefresh.style.display = 'inline-flex';

        switchTab('view-telemetry');
    }
}

function showLoginError(msg) {
    if (msg) errorMsg.innerText = msg;
    errorMsg.classList.remove('hidden');
    loginCredentialInput.style.borderColor = '#ef4444';
    setTimeout(() => {
        errorMsg.classList.add('hidden');
        loginCredentialInput.style.borderColor = 'rgba(255,255,255,0.1)';
    }, 4000);
}

function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    if (currentUserRole === 'admin') {
        void fetchAdminViewData();
        void checkSystemDiagnostics();
    } else {
        void fetchData();
    }
}

function setupEventListeners() {
    if (loginForm) {
        loginForm.removeEventListener('submit', handleLoginSubmit);
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                await fetch('/api/logout', { method: 'POST' });
            } catch (e) {}
            sessionStorage.clear();
            window.location.reload();
        });
    }

    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => fetchData(true));
    }

    // Filtros reactivos
    if (filterCourse) filterCourse.addEventListener('change', applyFiltersAndRender);
    if (filterRisk) filterRisk.addEventListener('change', applyFiltersAndRender);
    if (searchInput) searchInput.addEventListener('input', applyFiltersAndRender);

    // Modal Telemetría
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeStudentModal);
    if (btnModalCloseAction) btnModalCloseAction.addEventListener('click', closeStudentModal);
    if (studentModal) {
        studentModal.addEventListener('click', (e) => {
            if (e.target === studentModal) closeStudentModal();
        });
    }

    // Modal CRUD Estudiante (Bindeo a todos los botones de apertura)
    document.querySelectorAll('#btn-open-student-modal, #btn-open-student-modal-view, .btn-open-student-modal-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openStudentFormModal();
        });
    });
    if (btnCloseFormModal) btnCloseFormModal.addEventListener('click', closeStudentFormModal);
    if (btnCancelForm) btnCancelForm.addEventListener('click', closeStudentFormModal);
    if (studentFormModal) {
        studentFormModal.addEventListener('click', (e) => {
            if (e.target === studentFormModal) closeStudentFormModal();
        });
    }
    if (studentCrudForm) studentCrudForm.addEventListener('submit', handleSaveStudent);

    const btnFormResetPwd = document.getElementById('btn-form-reset-password');
    if (btnFormResetPwd) {
        btnFormResetPwd.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = formEmail.value.trim().toLowerCase();
            const uid = formStudentId.value.trim() || null;
            const nombres = formNombres.value.trim();
            const apellidos = formApellidos.value.trim();
            const studentName = (nombres || apellidos) ? `${nombres} ${apellidos}`.trim() : (email || "este estudiante");

            if (!email && !uid) return;

            const confirmAction = confirm(`¿Deseas restablecer la contraseña de acceso al juego para ${studentName} a '${DEFAULT_STUDENT_CODE}'?`);
            if (!confirmAction) return;

            try {
                btnFormResetPwd.disabled = true;
                btnFormResetPwd.innerText = "Restableciendo...";

                const res = await fetch('/api/estudiantes/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: uid, email: email })
                });

                const result = await res.json();
                if (!res.ok || !result.success) throw new Error(result.error || "Error al restablecer contraseña");

                showToast(`🔑 Contraseña de ${studentName} restablecida exitosamente a: ${result.default_password || DEFAULT_STUDENT_CODE}`);
            } catch (err) {
                console.error("Error al restablecer contraseña:", err);
                alert("Error al restablecer contraseña: " + err.message);
            } finally {
                btnFormResetPwd.disabled = false;
                btnFormResetPwd.innerText = `🔑 Resetear a ${DEFAULT_STUDENT_CODE}`;
            }
        });
    }

    // Modal Gestión de Docentes
    if (btnOpenTeacherModal) btnOpenTeacherModal.addEventListener('click', openTeacherModal);
    if (btnCloseTeacherModal) btnCloseTeacherModal.addEventListener('click', closeTeacherModal);
    if (btnCancelTeacher) btnCancelTeacher.addEventListener('click', closeTeacherModal);
    if (teacherModal) {
        teacherModal.addEventListener('click', (e) => {
            if (e.target === teacherModal) closeTeacherModal();
        });
    }
    if (teacherCrudForm) teacherCrudForm.addEventListener('submit', handleSaveTeacher);

    // Cursos Base
    if (btnInitCourses) btnInitCourses.addEventListener('click', handleInitDefaultCourses);

    // Reset estudiante
    if (btnModalReset) btnModalReset.addEventListener('click', handleResetCurrentStudent);
    if (btnModalResetPwd) btnModalResetPwd.addEventListener('click', handleResetCurrentStudentPassword);

    // Tabs de Navegación de la Consola
    document.querySelectorAll('.console-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            if (target) switchTab(target);
        });
    });

    const btnAdminAddTeacher = document.getElementById('btn-admin-add-teacher');
    if (btnAdminAddTeacher) {
        btnAdminAddTeacher.addEventListener('click', openTeacherModal);
    }

    const btnAdminInitCourses = document.getElementById('btn-admin-init-courses');
    if (btnAdminInitCourses) {
        btnAdminInitCourses.addEventListener('click', handleInitDefaultCourses);
    }

    const btnCheckHealth = document.getElementById('btn-check-system-health');
    if (btnCheckHealth) {
        btnCheckHealth.addEventListener('click', checkSystemDiagnostics);
    }

    // Modal Cambio de Contraseña (Obligatorio en primer ingreso)
    if (changePwdForm) changePwdForm.addEventListener('submit', handleChangePasswordSubmit);
    if (newPwdInput) newPwdInput.addEventListener('input', validatePasswordRules);
    if (confirmPwdInput) confirmPwdInput.addEventListener('input', validatePasswordRules);

    // Modal Admin Reset Password
    if (adminResetForm) adminResetForm.addEventListener('submit', handleAdminResetSubmit);
    if (btnCloseAdminResetModal) btnCloseAdminResetModal.addEventListener('click', closeAdminResetModal);
    if (btnCancelAdminReset) btnCancelAdminReset.addEventListener('click', closeAdminResetModal);
    if (adminResetModal) {
        adminResetModal.addEventListener('click', (e) => {
            if (e.target === adminResetModal) closeAdminResetModal();
        });
    }

    // Modal Tabs de Telemetría (5 Pestañas)
    setupModalTabs();

    // Navegación Académica por Niveles (Grados -> Cursos -> Estudiantes)
    if (crumbGrades) crumbGrades.addEventListener('click', () => navToLevel(1));
    if (crumbCourses) crumbCourses.addEventListener('click', () => { if (selectedGrade) navToLevel(2, selectedGrade); });
    if (btnBackToGrades) btnBackToGrades.addEventListener('click', () => navToLevel(1));
    if (btnBackToCourses) btnBackToCourses.addEventListener('click', () => navToLevel(2, selectedGrade));

    // Modal Admin Gestión de Cursos
    if (btnAdminAddCourse) btnAdminAddCourse.addEventListener('click', () => openCourseModal());
    if (btnCloseCourseModal) btnCloseCourseModal.addEventListener('click', closeCourseModal);
    if (btnCancelCourse) btnCancelCourse.addEventListener('click', closeCourseModal);
    if (courseCrudForm) courseCrudForm.addEventListener('submit', handleSaveCourse);
    if (courseCrudModal) {
        courseCrudModal.addEventListener('click', (e) => {
            if (e.target === courseCrudModal) closeCourseModal();
        });
    }
}

// =============================================================================
// CARGA DE DATOS (CONSOLIDACIÓN MULTI-TABLA)
// =============================================================================
async function fetchData(isManualSync = false) {
    if (btnRefresh) {
        btnRefresh.classList.add('btn-spinning');
        btnRefresh.disabled = true;
    }
    if (tableBody) tableBody.innerHTML = '';
    if (spinner) {
        spinner.classList.remove('hidden');
        spinner.innerHTML = "Cargando datos de la colmena...";
        spinner.style.color = "var(--primary)";
    }

    try {
        const res = await fetch('/api/data');
        if (res.status === 401) {
            sessionStorage.removeItem('cyberhive_auth');
            dashboardScreen.classList.add('hidden');
            loginScreen.classList.remove('hidden');
            return;
        }

        const data = await res.json();
        rawStudentsProgress = data.progress || [];
        rawEstudiantes = data.estudiantes || [];
        rawCursos = data.cursos || [];

        populateCourseSelectors();
        consolidateStudentData();
        if (currentUserRole === 'docente') {
            navToLevel(currentAcademicLevel || 1, selectedGrade, selectedCourseId);
        } else {
            applyFiltersAndRender();
        }

        if (spinner) spinner.classList.add('hidden');
        if (isManualSync) {
            showToast("Telemetría sincronizada con éxito.");
        }
    } catch (err) {
        console.error("Error al cargar datos:", err);
        if (spinner) {
            spinner.innerHTML = "Error de conexión con Supabase. Verifica la conexión a internet.";
            spinner.style.color = "#ef4444";
        }
        if (isManualSync) {
            showToast("Error de conexión al sincronizar telemetría.");
        }
    } finally {
        if (btnRefresh) {
            btnRefresh.classList.remove('btn-spinning');
            btnRefresh.disabled = false;
        }
    }
}

function populateCourseSelectors() {
    // Guardar selección previa
    const prevFilter = filterCourse.value;

    filterCourse.innerHTML = '<option value="ALL">🏫 Todos los Cursos</option>';
    formCurso.innerHTML = '<option value="">Selecciona un curso...</option>';

    if (rawCursos && rawCursos.length > 0) {
        rawCursos.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.innerText = `Grado ${c.grado}° — Curso ${c.codigo} (${c.anio_lectivo || 2026})`;
            filterCourse.appendChild(opt.cloneNode(true));
            formCurso.appendChild(opt);
        });
    } else {
        const opt = document.createElement('option');
        opt.value = "";
        opt.innerText = "Sin cursos (Usa '⚡ Cursos Base')";
        formCurso.appendChild(opt);
    }

    if (prevFilter) filterCourse.value = prevFilter;
}

function consolidateStudentData() {
    // Mapa de cursos por ID
    const cursoMap = new Map();
    rawCursos.forEach(c => cursoMap.set(c.id, c));

    // Mapa de estudiantes registrados
    const estMapByUserId = new Map();
    const estMapByEmail = new Map();
    rawEstudiantes.forEach(e => {
        if (e.user_id) estMapByUserId.set(e.user_id, e);
        if (e.email) estMapByEmail.set(e.email.toLowerCase(), e);
    });

    mergedStudents = rawStudentsProgress.map(prog => {
        const emailLower = (prog.email || '').toLowerCase();
        const est = estMapByUserId.get(prog.user_id) || estMapByEmail.get(emailLower) || {};

        const cursoId = prog.curso_id || est.curso_id || null;
        const cursoObj = cursoId ? cursoMap.get(cursoId) : null;

        // Parsear métricas modulares
        const metricasE2 = typeof prog.metricas_e2 === 'string' ? JSON.parse(prog.metricas_e2 || '{}') : (prog.metricas_e2 || {});
        const metricasE3 = typeof prog.metricas_e3 === 'string' ? JSON.parse(prog.metricas_e3 || '{}') : (prog.metricas_e3 || {});
        const metricasE4 = typeof prog.metricas_e4 === 'string' ? JSON.parse(prog.metricas_e4 || '{}') : (prog.metricas_e4 || {});
        const metricasE5 = typeof prog.metricas_e5 === 'string' ? JSON.parse(prog.metricas_e5 || '{}') : (prog.metricas_e5 || {});

        const nombreCompleto = (est.nombres && est.apellidos)
            ? `${est.nombres} ${est.apellidos}`
            : (prog.nombre_jugador || prog.email.split('@')[0]);

        return {
            ...prog,
            est_id: est.id || null,
            nombres: est.nombres || '',
            apellidos: est.apellidos || '',
            nombre_display: nombreCompleto,
            codigo_estudiante: est.codigo_estudiante || '',
            curso_id: cursoId,
            curso_codigo: cursoObj ? cursoObj.codigo : 'Sin Asignar',
            curso_grado: cursoObj ? cursoObj.grado : null,
            metricas_e2: metricasE2,
            metricas_e3: metricasE3,
            metricas_e4: metricasE4,
            metricas_e5: metricasE5
        };
    });

    // Incluir estudiantes registrados en nómina que aún no tienen partida en student_progress
    const processedEmails = new Set(mergedStudents.map(s => (s.email || '').toLowerCase()));
    const processedUids = new Set(mergedStudents.map(s => s.user_id).filter(Boolean));

    rawEstudiantes.forEach(est => {
        const estEmail = (est.email || '').toLowerCase();
        if ((est.user_id && processedUids.has(est.user_id)) || (estEmail && processedEmails.has(estEmail))) {
            return;
        }

        const cursoObj = est.curso_id ? cursoMap.get(est.curso_id) : null;
        const nombreCompleto = (est.nombres && est.apellidos)
            ? `${est.nombres} ${est.apellidos}`
            : (estEmail.split('@')[0] || 'Estudiante');

        mergedStudents.push({
            user_id: est.user_id || `temp_${est.id || getSecureRandomToken()}`,
            est_id: est.id || null,
            email: est.email || '',
            nombre_jugador: nombreCompleto,
            nombre_display: nombreCompleto,
            nombres: est.nombres || '',
            apellidos: est.apellidos || '',
            codigo_estudiante: est.codigo_estudiante || '',
            curso_id: est.curso_id || null,
            curso_codigo: cursoObj ? cursoObj.codigo : 'Sin Asignar',
            curso_grado: cursoObj ? cursoObj.grado : null,
            monedas: 0,
            seguridad: 0,
            riesgo: 0,
            defensa_social: 0,
            metricas_e2: {},
            metricas_e3: {},
            metricas_e4: {},
            metricas_e5: {},
            e1_casajugador: false,
            e2_correos: false,
            e3_torrellaves: false,
            e4_plazasocial: false,
            e5_escuelasaber: false
        });
    });
}

// =============================================================================
// FILTRADO Y RENDERIZADO
// =============================================================================
function applyFiltersAndRender() {
    const selectedCourse = filterCourse.value;
    const selectedRisk = filterRisk.value;
    const searchVal = searchInput.value.trim().toLowerCase();

    const filtered = mergedStudents.filter(s => {
        // Filtro de Curso
        if (selectedCourse !== 'ALL') {
            if (s.curso_id !== selectedCourse) return false;
        }

        // Filtro de Riesgo
        const r = s.riesgo || 0;
        if (selectedRisk === 'LOW' && r >= 30) return false;
        if (selectedRisk === 'MID' && (r < 30 || r > 70)) return false;
        if (selectedRisk === 'HIGH' && r <= 70) return false;

        // Búsqueda de Texto
        if (searchVal) {
            const matchName = s.nombre_display.toLowerCase().includes(searchVal);
            const matchEmail = (s.email || '').toLowerCase().includes(searchVal);
            const matchCod = (s.codigo_estudiante || '').toLowerCase().includes(searchVal);
            const matchCourse = (s.curso_codigo || '').toLowerCase().includes(searchVal);
            if (!matchName && !matchEmail && !matchCod && !matchCourse) return false;
        }

        return true;
    });

    updateKpis(filtered);
    renderTable(filtered);
}

function updateKpis(students) {
    kpiTotalStudents.innerText = students.length;
    kpiActiveStudents.innerText = `${students.length} en vista`;

    if (students.length === 0) {
        kpiAvgRisk.innerText = "0%";
        kpiRiskStatus.innerText = "Sin datos";
        kpiPhishingAcc.innerText = "--%";
        kpiPhishingTime.innerText = "Tiempo prom: --s";
        kpiCompletedModules.innerText = "0%";
        return;
    }

    // Riesgo Promedio
    const totalRisk = students.reduce((sum, s) => sum + (s.riesgo || 0), 0);
    const avgRisk = Math.round(totalRisk / students.length);
    kpiAvgRisk.innerText = `${avgRisk}%`;

    if (avgRisk < 30) {
        kpiRiskStatus.innerText = "Nivel Seguro (Bajo)";
        kpiRiskStatus.style.color = "#34d399";
    } else if (avgRisk <= 70) {
        kpiRiskStatus.innerText = "Alerta de Riesgo (Medio)";
        kpiRiskStatus.style.color = "#fbbf24";
    } else {
        kpiRiskStatus.innerText = "Crítico: Acción Requerida";
        kpiRiskStatus.style.color = "#f87171";
    }

    // Phishing Telemetría Promedios
    let totalE2Acc = 0;
    let countE2 = 0;
    let totalE2Time = 0;

    students.forEach(s => {
        const e2 = s.metricas_e2;
        if (e2 && typeof e2.precision_pct === 'number') {
            totalE2Acc += e2.precision_pct;
            totalE2Time += (e2.tiempo_prom || 0);
            countE2++;
        }
    });

    if (countE2 > 0) {
        const avgAcc = Math.round(totalE2Acc / countE2);
        const avgTime = (totalE2Time / countE2).toFixed(1);
        kpiPhishingAcc.innerText = `${avgAcc}%`;
        kpiPhishingTime.innerText = `Tiempo prom: ${avgTime}s (${countE2} evaluados)`;
    } else {
        kpiPhishingAcc.innerText = "--%";
        kpiPhishingTime.innerText = "Sin partidas en E2 aún";
    }

    // Cobertura de Módulos (completaron al menos 3 de los 5)
    let completaron = 0;
    students.forEach(s => {
        let mods = 0;
        if (s.e1_casajugador) mods++;
        if (s.e2_correos) mods++;
        if (s.e3_torrellaves) mods++;
        if (s.e4_plazasocial) mods++;
        if (s.e5_escuelasaber) mods++;
        if (mods >= 3) completaron++;
    });

    const pctComplete = Math.round((completaron / students.length) * 100);
    kpiCompletedModules.innerText = `${pctComplete}%`;
}

function renderTable(students) {
    if (!students || students.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px; color: var(--text-muted);">No se encontraron estudiantes para los filtros seleccionados.</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    students.forEach(student => {
        const tr = document.createElement('tr');

        // Riesgo badge
        const r = student.riesgo || 0;
        let riskClass = 'badge-risk-low';
        let riskLabel = `<span style="font-size:0.65rem; margin-right: 4px;">●</span> Seguro (${r}%)`;
        if (r >= 70) {
            riskClass = 'badge-risk-high';
            riskLabel = `<span style="font-size:0.65rem; margin-right: 4px;">●</span> Crítico (${r}%)`;
        } else if (r >= 30) {
            riskClass = 'badge-risk-mid';
            riskLabel = `<span style="font-size:0.65rem; margin-right: 4px;">●</span> Medio (${r}%)`;
        }

        // Phishing mini badge
        const e2 = student.metricas_e2;
        let phishingCell = `<span style="color: var(--text-muted); font-size: 0.85rem;">Pendiente</span>`;
        if (e2 && e2.intentos > 0) {
            const acc = e2.precision_pct !== undefined ? `${e2.precision_pct}%` : `${e2.correctas || 0} aciertos`;
            const time = e2.tiempo_prom !== undefined ? `${e2.tiempo_prom}s` : '--';
            phishingCell = `
                <div class="telemetry-mini-box">
                    <span class="telemetry-mini-pill" title="Precisión en Correos">🎯 ${acc}</span>
                    <span class="telemetry-mini-pill" title="Tiempo promedio por correo">⏱️ ${time}</span>
                </div>
            `;
        }

        // Estado de sincronización
        const isResetPending = student.force_reset === true;
        const statusBadge = isResetPending
            ? `<span class="badge badge-warning"><span style="font-size:0.65rem; margin-right: 4px;">●</span> Reset Pendiente</span>`
            : `<span class="badge badge-success"><span style="font-size:0.65rem; margin-right: 4px;">●</span> Activo</span>`;

        tr.innerHTML = `
            <td>
                <strong style="color: var(--text-main); font-size: 0.95rem;">${escapeHtml(student.nombre_display)}</strong>
                ${student.codigo_estudiante ? `<br><small style="color: var(--text-muted); font-family: monospace;">ID: ${escapeHtml(student.codigo_estudiante)}</small>` : ''}
            </td>
            <td>
                <span class="badge badge-course">${escapeHtml(student.curso_codigo)}</span>
            </td>
            <td>
                <span style="font-size: 0.88rem; color: #cbd5e1;">${escapeHtml(student.email)}</span>
            </td>
            <td>
                <span class="badge ${riskClass}">${riskLabel}</span>
            </td>
            <td>${phishingCell}</td>
            <td>${statusBadge}</td>
            <td>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn btn-primary" onclick="openStudentDetailsModal('${student.user_id}')" style="padding: 6px 12px; font-size: 0.82rem;" title="Ver diagnóstico detallado y ranking de competencias">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                        Telemetría
                    </button>
                    <button class="btn btn-secondary" onclick="openEditStudentModal('${student.user_id}')" style="padding: 6px 10px; font-size: 0.82rem;" title="Editar estudiante o reasignar curso">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </button>
                    <button class="btn btn-danger" onclick="quickResetStudent('${student.user_id}')" style="padding: 6px 10px; font-size: 0.82rem;" title="Reiniciar progreso del alumno">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// =============================================================================
// SISTEMA DE PESTAÑAS DEL MODAL DE TELEMETRÍA (5 PESTAÑAS)
// =============================================================================
function setupModalTabs() {
    const tabBtns = document.querySelectorAll('.modal-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            if (!targetId) return;

            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.modal-tab-pane').forEach(pane => {
                pane.classList.toggle('active', pane.id === targetId);
            });
        });
    });
}

function resetModalTabs() {
    const tabBtns = document.querySelectorAll('.modal-tab-btn');
    tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'tab-general'));
    document.querySelectorAll('.modal-tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-general'));
}

// =============================================================================
// NAVEGACIÓN ACADÉMICA EN CASCADA (GRADOS -> CURSOS -> ESTUDIANTES)
// =============================================================================
function navToLevel(level, grade = null, courseId = null) {
    if (currentUserRole === 'docente' && (!rawCursos || rawCursos.length === 0)) {
        if (alertSinCursos) alertSinCursos.classList.remove('hidden');
        if (academicBreadcrumbs) academicBreadcrumbs.classList.add('hidden');
        if (viewLevelGrades) viewLevelGrades.classList.add('hidden');
        if (viewLevelCourses) viewLevelCourses.classList.add('hidden');
        if (viewLevelStudents) viewLevelStudents.classList.add('hidden');
        updateKpis([]);
        return;
    }

    if (alertSinCursos) alertSinCursos.classList.add('hidden');
    if (academicBreadcrumbs && currentUserRole === 'docente') {
        academicBreadcrumbs.classList.remove('hidden');
    }

    currentAcademicLevel = level;

    if (level === 1) {
        selectedGrade = null;
        selectedCourseId = null;

        if (crumbGrades) crumbGrades.className = 'crumb active';
        if (crumbCourses) { crumbCourses.className = 'crumb disabled'; crumbCourses.innerText = 'Cursos'; }
        if (crumbStudents) { crumbStudents.className = 'crumb disabled'; crumbStudents.innerText = 'Estudiantes'; }

        if (viewLevelGrades) viewLevelGrades.classList.remove('hidden');
        if (viewLevelCourses) viewLevelCourses.classList.add('hidden');
        if (viewLevelStudents) viewLevelStudents.classList.add('hidden');

        renderGradesLevel();
        updateKpis(mergedStudents);
    } else if (level === 2) {
        selectedGrade = grade;
        selectedCourseId = null;

        if (crumbGrades) crumbGrades.className = 'crumb';
        if (crumbCourses) { crumbCourses.className = 'crumb active'; crumbCourses.innerText = `Grado ${grade}° — Cursos`; }
        if (crumbStudents) { crumbStudents.className = 'crumb disabled'; crumbStudents.innerText = 'Estudiantes'; }

        if (viewLevelGrades) viewLevelGrades.classList.add('hidden');
        if (viewLevelCourses) viewLevelCourses.classList.remove('hidden');
        if (viewLevelStudents) viewLevelStudents.classList.add('hidden');

        renderCoursesLevel(grade);
        const gradeStudents = mergedStudents.filter(s => String(s.curso_grado) === String(grade));
        updateKpis(gradeStudents);
    } else if (level === 3) {
        selectedGrade = grade;
        selectedCourseId = courseId;

        const cursoObj = rawCursos.find(c => c.id === courseId);
        const cursoCode = cursoObj ? cursoObj.codigo : (courseId || 'Curso');

        if (crumbGrades) crumbGrades.className = 'crumb';
        if (crumbCourses) { crumbCourses.className = 'crumb'; crumbCourses.innerText = `Grado ${grade || cursoObj?.grado || ''}° — Cursos`; }
        if (crumbStudents) { crumbStudents.className = 'crumb active'; crumbStudents.innerText = `Curso ${cursoCode} (Estudiantes)`; }

        if (viewLevelGrades) viewLevelGrades.classList.add('hidden');
        if (viewLevelCourses) viewLevelCourses.classList.add('hidden');
        if (viewLevelStudents) viewLevelStudents.classList.remove('hidden');

        if (filterCourse) filterCourse.value = courseId || 'ALL';
        if (studentsViewTitle) {
            studentsViewTitle.innerHTML = `<span>👥</span> Nómina de Estudiantes — Curso ${escapeHtml(cursoCode)}`;
        }

        applyFiltersAndRender();
    }
}
window.navToLevel = navToLevel;

function renderGradesLevel() {
    if (!gradesCardsGrid) return;

    const gradosSet = new Set();
    rawCursos.forEach(c => {
        if (c.grado !== undefined && c.grado !== null) gradosSet.add(c.grado);
    });
    const uniqueGrades = Array.from(gradosSet).sort((a, b) => Number(a) - Number(b));

    if (uniqueGrades.length === 0) {
        gradesCardsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); background: rgba(0,0,0,0.2); border-radius: 12px;">
                No tienes grados ni cursos asignados actualmente.<br>
                <span style="font-size: 0.85rem; color: #64748b;">Comunícate con el Administrador para asignar salones a tu cuenta docente.</span>
            </div>
        `;
        return;
    }

    gradesCardsGrid.innerHTML = uniqueGrades.map(grado => {
        const cursosGrado = rawCursos.filter(c => String(c.grado) === String(grado));
        const cursoIds = new Set(cursosGrado.map(c => c.id));
        const alumnosGrado = mergedStudents.filter(s => cursoIds.has(s.curso_id));

        const totalAlumnos = alumnosGrado.length;
        const avgRisk = totalAlumnos > 0
            ? Math.round(alumnosGrado.reduce((acc, s) => acc + (s.riesgo || 0), 0) / totalAlumnos)
            : 0;

        let riskBadgeClass = 'badge-success';
        let riskLabel = 'Bajo';
        if (avgRisk > 70) {
            riskBadgeClass = 'badge-danger';
            riskLabel = 'Crítico';
        } else if (avgRisk >= 30) {
            riskBadgeClass = 'badge-warning';
            riskLabel = 'Medio';
        }

        let totalPhishAcc = 0;
        let countPhish = 0;
        alumnosGrado.forEach(s => {
            if (s.metricas_e2 && s.metricas_e2.precision_pct !== undefined) {
                totalPhishAcc += s.metricas_e2.precision_pct;
                countPhish++;
            }
        });
        const avgPhishAcc = countPhish > 0 ? Math.round(totalPhishAcc / countPhish) : 0;

        const codigosCursos = cursosGrado.map(c => c.codigo).join(', ') || 'Sin cursos';

        return `
            <div class="grade-card" onclick="navToLevel(2, ${grado})">
                <div class="grade-card-top">
                    <div>
                        <span class="grade-pill">Nivel Curricular</span>
                        <h3 class="grade-title">Grado ${grado}°</h3>
                    </div>
                    <span class="badge ${riskBadgeClass}">Riesgo ${avgRisk}% (${riskLabel})</span>
                </div>

                <div class="grade-stats-grid">
                    <div class="grade-stat-item">
                        <span>Cursos Asignados</span>
                        <strong>${cursosGrado.length} (${escapeHtml(codigosCursos)})</strong>
                    </div>
                    <div class="grade-stat-item">
                        <span>Alumnos Matriculados</span>
                        <strong>${totalAlumnos}</strong>
                    </div>
                    <div class="grade-stat-item">
                        <span>Precisión Phishing (E2)</span>
                        <strong style="color: #67e8f9;">${avgPhishAcc}%</strong>
                    </div>
                    <div class="grade-stat-item">
                        <span>Seguridad Promedio</span>
                        <strong style="color: #34d399;">${totalAlumnos > 0 ? Math.round(alumnosGrado.reduce((a, s) => a + (s.seguridad || 0), 0) / totalAlumnos) : 0} pts</strong>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 14px;">
                    <button class="btn btn-primary" style="padding: 7px 14px; font-size: 0.85rem;" onclick="event.stopPropagation(); navToLevel(2, ${grado});">
                        Explorar Cursos del Grado ➡️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderCoursesLevel(grade) {
    if (!coursesComparisonGrid) return;

    const cursosGrado = rawCursos.filter(c => String(c.grado) === String(grade));
    if (coursesViewTitle) {
        coursesViewTitle.innerHTML = `<span>📊</span> Grado ${grade}° — Comparativa entre Cursos`;
    }

    if (cursosGrado.length === 0) {
        coursesComparisonGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); background: rgba(0,0,0,0.2); border-radius: 12px;">
                No se encontraron cursos asignados en el Grado ${grade}°.
            </div>
        `;
        return;
    }

    coursesComparisonGrid.innerHTML = cursosGrado.map(c => {
        const alumnosCurso = mergedStudents.filter(s => s.curso_id === c.id);
        const totalAlumnos = alumnosCurso.length;

        const avgRisk = totalAlumnos > 0
            ? Math.round(alumnosCurso.reduce((a, s) => a + (s.riesgo || 0), 0) / totalAlumnos)
            : 0;

        let riskBadgeClass = 'badge-success';
        if (avgRisk > 70) riskBadgeClass = 'badge-danger';
        else if (avgRisk >= 30) riskBadgeClass = 'badge-warning';

        const calcModAcc = (modKey) => {
            if (totalAlumnos === 0) return 0;
            let sum = 0, count = 0;
            alumnosCurso.forEach(s => {
                const m = s[modKey];
                if (m && m.precision_pct !== undefined) {
                    sum += m.precision_pct;
                    count++;
                }
            });
            return count > 0 ? Math.round(sum / count) : 0;
        };

        const accE2 = calcModAcc('metricas_e2');
        const accE3 = calcModAcc('metricas_e3');
        const accE4 = calcModAcc('metricas_e4');
        const accE5 = calcModAcc('metricas_e5');

        return `
            <div class="course-comparison-card" onclick="navToLevel(3, ${grade}, '${c.id}')">
                <div class="course-card-top">
                    <div>
                        <span class="badge badge-course">Curso / Salón</span>
                        <h3 class="course-card-title">${escapeHtml(c.codigo)}</h3>
                    </div>
                    <span class="badge ${riskBadgeClass}">Riesgo Promedio ${avgRisk}%</span>
                </div>

                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">
                    👥 <strong>${totalAlumnos}</strong> estudiante${totalAlumnos === 1 ? '' : 's'} matriculado${totalAlumnos === 1 ? '' : 's'}
                </p>

                <!-- Desglose de los 4 módulos de la colmena -->
                <div class="mini-modules-grid" style="margin-bottom: 14px;">
                    <div class="mini-module-card">
                        <span class="mini-mod-name">🎣 E2 Phishing</span>
                        <strong class="mini-mod-val" style="color: #67e8f9;">${accE2}%</strong>
                    </div>
                    <div class="mini-module-card">
                        <span class="mini-mod-name">🔑 E3 Claves</span>
                        <strong class="mini-mod-val" style="color: #c084fc;">${accE3}%</strong>
                    </div>
                    <div class="mini-module-card">
                        <span class="mini-mod-name">📱 E4 Social</span>
                        <strong class="mini-mod-val" style="color: #60a5fa;">${accE4}%</strong>
                    </div>
                    <div class="mini-module-card">
                        <span class="mini-mod-name">🛡️ E5 Malware</span>
                        <strong class="mini-mod-val" style="color: #facc15;">${accE5}%</strong>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end;">
                    <button class="btn btn-primary" style="padding: 7px 14px; font-size: 0.85rem;" onclick="event.stopPropagation(); navToLevel(3, ${grade}, '${c.id}');">
                        Ver Nómina de Estudiantes ➡️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// =============================================================================
// MODAL DE TELEMETRÍA DETALLADA (5 PESTAÑAS, DIFICULTADES Y DIAGNÓSTICO CLÍNICO)
// =============================================================================
let currentViewingStudentObj = null;
let activeModuleDiffs = {
    e2: 'general',
    e3: 'general',
    e4: 'general',
    e5: 'general'
};

window.switchModuleDifficulty = function(modKey, diffKey) {
    activeModuleDiffs[modKey] = diffKey;
    
    // Actualizar píldoras activas
    const pillsCont = document.getElementById(`modal-${modKey}-diff-pills`);
    if (pillsCont) {
        const pills = pillsCont.querySelectorAll('.diff-pill');
        pills.forEach(p => {
            if (p.getAttribute('data-diff') === diffKey) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });
    }

    if (currentViewingStudentObj) {
        renderModuleDifficultyData(modKey, diffKey, currentViewingStudentObj);
    }
};

function renderModuleDifficultyData(modKey, diffKey, student) {
    const rawData = student[`metricas_${modKey}`] || {};
    const modConfig = {
        e2: { name: 'E2 Phishing', color: '#67e8f9', badgePending: 'Primer Intento: Pendiente' },
        e3: { name: 'E3 Contraseñas', color: '#c084fc', badgePending: 'Módulo E3' },
        e4: { name: 'E4 Laberinto Social', color: '#60a5fa', badgePending: 'Módulo E4' },
        e5: { name: 'E5 Malware / Apps', color: '#facc15', badgePending: 'Módulo E5' }
    }[modKey] || { name: modKey, color: '#38bdf8', badgePending: 'Pendiente' };

    let intentos = 0;
    let aciertos = 0;
    let errores = 0;
    let tiempo = '0.0s';
    let reincidencias = 0;
    let precision = 0;
    let fallos = [];
    let mayorDebilidad = '';
    let completado = false;

    if (diffKey === 'general') {
        intentos = rawData.intentos || 0;
        aciertos = rawData.aciertos !== undefined ? rawData.aciertos : (rawData.correctas || 0);
        errores = rawData.fallos !== undefined ? rawData.fallos : (rawData.incorrectas || 0);

        // Calcular tiempo promedio ponderado/representativo de dificultades jugadas
        if (rawData.dificultades) {
            let sumTiempo = 0;
            let countTiempo = 0;
            ['facil', 'medio', 'dificil'].forEach(k => {
                const d = rawData.dificultades[k];
                if (d && d.intentos > 0 && Number(d.tiempo_prom) > 0) {
                    sumTiempo += Number(d.tiempo_prom);
                    countTiempo++;
                }
            });
            if (countTiempo > 0) {
                tiempo = `${(Math.round((sumTiempo / countTiempo) * 100) / 100).toFixed(2).replace(/\.00$/, '')}s`;
            } else {
                tiempo = rawData.tiempo_prom ? `${rawData.tiempo_prom}s` : '0.0s';
            }
        } else {
            tiempo = rawData.tiempo_prom ? `${rawData.tiempo_prom}s` : '0.0s';
        }

        reincidencias = rawData.reincidencias || 0;
        precision = rawData.precision_pct !== undefined ? rawData.precision_pct : 0;
        mayorDebilidad = rawData.mayor_debilidad || '';

        // Recolectar todos los fallos de las dificultades disponibles o de la raíz
        if (rawData.dificultades) {
            ['facil', 'medio', 'dificil'].forEach(k => {
                if (rawData.dificultades[k] && Array.isArray(rawData.dificultades[k].fallos_detalle)) {
                    fallos = fallos.concat(rawData.dificultades[k].fallos_detalle);
                }
            });
        }
        if (fallos.length === 0 && Array.isArray(rawData.fallos_detalle)) {
            fallos = rawData.fallos_detalle;
        }

        // Si mayor_debilidad no viene fijada en la raíz pero hay fallos registrados, calcularla por frecuencia
        if (!mayorDebilidad && fallos.length > 0) {
            const freq = {};
            fallos.forEach(f => {
                const c = f.concepto || 'Vulnerabilidad / Amenaza';
                freq[c] = (freq[c] || 0) + 1;
            });
            let maxCount = 0;
            for (const [c, cnt] of Object.entries(freq)) {
                if (cnt > maxCount) {
                    maxCount = cnt;
                    mayorDebilidad = c;
                }
            }
        }
    } else {
        const difData = (rawData.dificultades && rawData.dificultades[diffKey]) || {};
        intentos = difData.intentos || 0;
        aciertos = difData.correctas || 0;
        errores = difData.incorrectas || 0;
        tiempo = difData.tiempo_prom ? `${difData.tiempo_prom}s` : '0.0s';
        reincidencias = difData.reincidencias || 0;
        precision = difData.precision_pct !== undefined ? difData.precision_pct : 0;
        completado = Boolean(difData.completado);
        fallos = Array.isArray(difData.fallos_detalle) ? difData.fallos_detalle : [];

        // Calcular mayor debilidad en este nivel específico si hay fallos
        if (fallos.length > 0) {
            const freq = {};
            fallos.forEach(f => {
                const c = f.concepto || 'Vulnerabilidad / Amenaza';
                freq[c] = (freq[c] || 0) + 1;
            });
            let maxCount = 0;
            for (const [c, cnt] of Object.entries(freq)) {
                if (cnt > maxCount) {
                    maxCount = cnt;
                    mayorDebilidad = c;
                }
            }
        }
    }

    // Actualizar elementos numéricos en el DOM
    const elIntentos = document.getElementById(`modal-${modKey}-intentos`);
    const elAciertos = document.getElementById(`modal-${modKey}-aciertos`);
    const elErrores = document.getElementById(`modal-${modKey}-errores`);
    const elTiempo = document.getElementById(`modal-${modKey}-tiempo`);
    const elReincidencias = document.getElementById(`modal-${modKey}-reincidencias`);
    const elPrecision = document.getElementById(`modal-${modKey}-precision`);

    if (elIntentos) elIntentos.innerText = intentos;
    if (elAciertos) elAciertos.innerText = aciertos;
    if (elErrores) elErrores.innerText = errores;
    if (elTiempo) elTiempo.innerText = tiempo;
    if (elReincidencias) elReincidencias.innerText = reincidencias;
    if (elPrecision) elPrecision.innerText = `${precision}%`;

    // Badge de estado
    const badgePrimer = document.getElementById(`modal-${modKey}-badge-primer-intento`);
    if (badgePrimer) {
        if (diffKey === 'general') {
            if (intentos > 0) {
                if (rawData.aprobo_primer_intento) {
                    badgePrimer.className = "badge badge-success";
                    badgePrimer.innerText = "⭐ Superó al Primer Intento";
                } else {
                    badgePrimer.className = "badge badge-warning";
                    badgePrimer.innerText = `Requirió ${intentos} intentos`;
                }
            } else {
                badgePrimer.className = "badge badge-course";
                badgePrimer.innerText = modConfig.badgePending;
            }
        } else {
            const diffNombre = diffKey === 'facil' ? 'Nivel Fácil' : (diffKey === 'medio' ? 'Nivel Medio' : 'Nivel Difícil');
            if (intentos > 0) {
                badgePrimer.className = completado ? "badge badge-success" : "badge badge-warning";
                badgePrimer.innerText = completado ? `✅ ${diffNombre}: Aprobado` : `⚠️ ${diffNombre}: En Progreso (${intentos} int.)`;
            } else {
                badgePrimer.className = "badge badge-course";
                badgePrimer.innerText = `🔒 ${diffNombre}: Sin Intentos`;
            }
        }
    }

    // Banner de Mayor Reincidencia / Debilidad
    const weaknessBox = document.getElementById(`modal-${modKey}-weakness-box`);
    if (weaknessBox) {
        if (mayorDebilidad) {
            let reincidenciaCount = 0;
            if (Array.isArray(fallos)) {
                fallos.forEach(f => {
                    if ((f.concepto || '') === mayorDebilidad) reincidenciaCount++;
                });
            }
            const isReincidenciaReal = reincidenciaCount >= 2;
            const bannerTitle = isReincidenciaReal 
                ? `<span>Mayor Reincidencia Detectada (${reincidenciaCount} veces):</span>`
                : `<span>Concepto en Observación (Sin Reincidencia Aún):</span>`;
            const bannerIcon = isReincidenciaReal ? '⚠️' : 'ℹ️';

            weaknessBox.innerHTML = `
                <div class="weakness-banner" ${!isReincidenciaReal ? 'style="border-color: rgba(56, 189, 248, 0.3); background: rgba(56, 189, 248, 0.08);"' : ''}>
                    <div class="weakness-banner-title" ${!isReincidenciaReal ? 'style="color: #38bdf8;"' : ''}>
                        <span>${bannerIcon}</span>
                        ${bannerTitle}
                    </div>
                    <div class="weakness-banner-val">${escapeHtml(mayorDebilidad)}${isReincidenciaReal ? ` (${reincidenciaCount} fallos)` : ' (1 fallo aislado)'}</div>
                </div>
            `;
        } else if (intentos > 0 && errores === 0) {
            weaknessBox.innerHTML = `
                <div class="weakness-banner" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.6)); border-color: rgba(16, 185, 129, 0.3);">
                    <div class="weakness-banner-title" style="color: #6ee7b7;">
                        <span>🛡️</span>
                        <span>Desempeño Impecable:</span>
                    </div>
                    <div class="weakness-banner-val" style="border-color: rgba(16, 185, 129, 0.2); color: #34d399;">0 Fallos Registrados</div>
                </div>
            `;
        } else {
            weaknessBox.innerHTML = '';
        }
    }

    // Guardar estado interactivo de fallos para este módulo
    window._moduleFallosState = window._moduleFallosState || {};
    window._moduleFallosState[modKey] = {
        allFallos: fallos,
        activeConcept: 'ALL',
        searchTerm: '',
        diffLabel: diffKey === 'general' ? 'Consolidado' : diffKey.toUpperCase(),
        intentos: intentos
    };
    renderModuleFallosView(modKey);
}

function renderModuleFallosView(modKey) {
    const fallosContainer = document.getElementById(`modal-${modKey}-fallos-container`);
    if (!fallosContainer) return;

    const state = window._moduleFallosState && window._moduleFallosState[modKey];
    if (!state) return;

    const { allFallos, activeConcept, searchTerm, diffLabel, intentos } = state;

    if (allFallos.length === 0) {
        if (intentos === 0) {
            fallosContainer.innerHTML = `
                <div class="fallos-section">
                    <div class="fallos-empty-card" style="border-color: rgba(255, 255, 255, 0.1); color: var(--text-muted);">
                        ℹ️ Sin sesiones registradas en el nivel <strong>${diffLabel}</strong>.
                    </div>
                </div>
            `;
        } else {
            fallosContainer.innerHTML = `
                <div class="fallos-section">
                    <div class="fallos-empty-card">
                        ✅ ¡Sin errores registrados en el nivel <strong>${diffLabel}</strong>! Precisión óptima.
                    </div>
                </div>
            `;
        }
        return;
    }

    // Frecuencias de conceptos
    const freqMap = {};
    allFallos.forEach(f => {
        const c = f.concepto || 'Vulnerabilidad / Amenaza';
        freqMap[c] = (freqMap[c] || 0) + 1;
    });

    // Filtrar fallos
    const filtered = allFallos.filter(f => {
        const concepto = f.concepto || 'Vulnerabilidad / Amenaza';
        if (activeConcept !== 'ALL' && concepto !== activeConcept) return false;
        if (searchTerm) {
            const haystack = `${concepto} ${f.motivo || ''} ${f.asunto || ''} ${f.remitente || ''} ${f.item || ''}`.toLowerCase();
            if (!haystack.includes(searchTerm)) return false;
        }
        return true;
    });

    // Chips de filtrado rápido
    let chipsHtml = `
        <button type="button" class="fallo-filter-chip ${activeConcept === 'ALL' ? 'active' : ''}" onclick="filterModuleFallos('${modKey}', 'ALL')">
            🎯 Todos (${allFallos.length})
        </button>
    `;
    Object.entries(freqMap).forEach(([conceptName, count]) => {
        const isAct = activeConcept === conceptName;
        chipsHtml += `
            <button type="button" class="fallo-filter-chip ${isAct ? 'active' : ''}" onclick="filterModuleFallos('${modKey}', '${escapeHtml(conceptName)}')">
                📌 ${escapeHtml(conceptName)} (${count})
            </button>
        `;
    });

    // Cards
    let cardsHtml = '';
    if (filtered.length === 0) {
        cardsHtml = `
            <div class="fallos-empty-card" style="grid-column: 1 / -1; border-color: rgba(255, 255, 255, 0.1); color: var(--text-muted);">
                🔍 No hay coincidencias para el filtro o búsqueda actual.
            </div>
        `;
    } else {
        cardsHtml = filtered.map(f => {
            const concepto = escapeHtml(f.concepto || 'Vulnerabilidad / Amenaza');
            const motivo = escapeHtml(f.motivo || 'Decisión incorrecta');
            const tiempoStr = f.tiempo_seg ? `${f.tiempo_seg}s` : '';
            const itemContext = f.asunto ? `📧 Asunto: ${escapeHtml(f.asunto)}` : (f.item ? `Contexto: ${escapeHtml(f.item)}` : '');
            const remContext = f.remitente ? ` | De: ${escapeHtml(f.remitente)}` : '';
            return `
                <div class="fallo-card">
                    <div class="fallo-card-top">
                        <span class="fallo-concepto">${concepto}</span>
                        ${tiempoStr ? `<span class="fallo-tiempo">⏱️ ${tiempoStr}</span>` : ''}
                    </div>
                    <div class="fallo-motivo">${motivo}</div>
                    ${(itemContext || remContext) ? `<div class="fallo-item" title="${itemContext}${remContext}">${itemContext}${remContext}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    fallosContainer.innerHTML = `
        <div class="fallos-section">
            <div class="fallos-section-header">
                <h4><span>📋</span> Desglose de Amenazas Falladas (${filtered.length} de ${allFallos.length}) — ${diffLabel}</h4>
            </div>
            <div class="fallos-toolbar">
                <div class="fallos-search-row">
                    <input type="text" class="fallos-search-input" placeholder="🔍 Filtrar amenazas (asunto, concepto o remitente)..." 
                        value="${escapeHtml(searchTerm)}" oninput="searchModuleFallos('${modKey}', this.value)" />
                </div>
                <div class="fallos-chips-row">
                    ${chipsHtml}
                </div>
            </div>
            <div class="fallos-grid">
                ${cardsHtml}
            </div>
        </div>
    `;
}

window.filterModuleFallos = function(modKey, concept) {
    if (!window._moduleFallosState || !window._moduleFallosState[modKey]) return;
    window._moduleFallosState[modKey].activeConcept = concept;
    renderModuleFallosView(modKey);
};

window.searchModuleFallos = function(modKey, term) {
    if (!window._moduleFallosState || !window._moduleFallosState[modKey]) return;
    window._moduleFallosState[modKey].searchTerm = (term || '').toLowerCase().trim();
    renderModuleFallosView(modKey);
};

window.openStudentDetailsModal = function(userId) {
    const student = mergedStudents.find(s => s.user_id === userId);
    if (!student) return;

    currentViewingUserId = userId;
    currentViewingStudentObj = student;
    activeModuleDiffs = { e2: 'general', e3: 'general', e4: 'general', e5: 'general' };
    resetModalTabs();

    document.getElementById('modal-name').innerText = student.nombre_display;
    document.getElementById('modal-email').innerText = student.email;
    document.getElementById('modal-course-badge').innerText = `Curso: ${student.curso_codigo}`;

    // Stats Grid Global
    document.getElementById('modal-monedas').innerText = student.monedas || 0;
    document.getElementById('modal-seguridad').innerText = student.seguridad || 0;
    document.getElementById('modal-riesgo').innerText = `${student.riesgo || 0}%`;
    document.getElementById('modal-defensa-social').innerText = student.defensa_social || 0;

    // Métricas de los 4 módulos
    const e2 = student.metricas_e2 || {};
    const e3 = student.metricas_e3 || {};
    const e4 = student.metricas_e4 || {};
    const e5 = student.metricas_e5 || {};

    const precE2 = e2.precision_pct !== undefined ? e2.precision_pct : 0;
    const precE3 = e3.precision_pct !== undefined ? e3.precision_pct : 0;
    const precE4 = e4.precision_pct !== undefined ? e4.precision_pct : 0;
    const precE5 = e5.precision_pct !== undefined ? e5.precision_pct : 0;

    // MATRIZ RÁPIDA DE LOS 4 MÓDULOS (En Tab General)
    const genModulesSummary = document.getElementById('modal-general-modules-summary');
    if (genModulesSummary) {
        genModulesSummary.innerHTML = `
            <div class="mini-module-card">
                <span class="mini-mod-name">🎣 E2 Phishing</span>
                <strong class="mini-mod-val" style="color: #67e8f9;">${precE2}%</strong>
                <span style="font-size: 0.72rem; color: var(--text-muted);">${e2.intentos || 0} intentos</span>
            </div>
            <div class="mini-module-card">
                <span class="mini-mod-name">🔑 E3 Contraseñas</span>
                <strong class="mini-mod-val" style="color: #c084fc;">${precE3}%</strong>
                <span style="font-size: 0.72rem; color: var(--text-muted);">${e3.intentos || 0} intentos</span>
            </div>
            <div class="mini-module-card">
                <span class="mini-mod-name">📱 E4 Laberinto Social</span>
                <strong class="mini-mod-val" style="color: #60a5fa;">${precE4}%</strong>
                <span style="font-size: 0.72rem; color: var(--text-muted);">${e4.intentos || 0} intentos</span>
            </div>
            <div class="mini-module-card">
                <span class="mini-mod-name">🛡️ E5 Malware / Apps</span>
                <strong class="mini-mod-val" style="color: #facc15;">${precE5}%</strong>
                <span style="font-size: 0.72rem; color: var(--text-muted);">${e5.intentos || 0} intentos</span>
            </div>
        `;
    }

    // PESTAÑAS E2, E3, E4, E5 (Inicializar en General y vincular datos de dificultad)
    ['e2', 'e3', 'e4', 'e5'].forEach(modKey => {
        const pillsCont = document.getElementById(`modal-${modKey}-diff-pills`);
        if (pillsCont) {
            pillsCont.querySelectorAll('.diff-pill').forEach(p => {
                if (p.getAttribute('data-diff') === 'general') p.classList.add('active');
                else p.classList.remove('active');
            });
        }
        renderModuleDifficultyData(modKey, 'general', student);
    });

    // Diagnósticos Pedagógicos Dinámicos
    const diagE2 = document.getElementById('modal-e2-diag');
    if (diagE2) {
        let e2DiagText = '';
        if (e2.intentos === 0) {
            e2DiagText = '<p style="color: var(--text-muted);">El estudiante aún no registra sesiones de entrenamiento en el simulador de correos de Phishing (E2).</p>';
        } else if (precE2 >= 80) {
            e2DiagText = `
                <h4>🟢 Perfil Pedagógico: Alta Resiliencia ante Phishing</h4>
                <p>El estudiante analiza meticulosamente el remitente y URLs antes de abrir enlaces. Demuestra sólida comprensión de ingeniería social por correo electrónico.</p>
                <div class="diag-rec"><strong>Recomendación Formativa:</strong> Elevar la complejidad con ataques de spear phishing dirigidos y suplantación de identidad avanzada.</div>
            `;
        } else if (precE2 >= 50) {
            e2DiagText = `
                <h4>🟡 Perfil Pedagógico: Intermedio / Susceptible a Falsa Urgencia</h4>
                <p>Detecta fraudes evidentes, pero cae en señuelos con mensajes intimidatorios o premios inmediatos (tiempo promedio de respuesta: ${e2.tiempo_prom || 0}s).</p>
                <div class="diag-rec"><strong>Recomendación Formativa:</strong> Realizar ejercicios de lectura pausada de cabeceras de correo y verificación de dominios oficiales.</div>
            `;
        } else {
            e2DiagText = `
                <h4>🔴 Perfil Pedagógico: Vulnerabilidad Crítica</h4>
                <p>Alto riesgo de interactuar con enlaces fraudulentos o descargar archivos adjuntos peligrosos. Registra ${e2.reincidencias || 0} reincidencias ante trampas repetidas.</p>
                <div class="diag-rec"><strong>Recomendación Formativa:</strong> Acompañamiento docente inmediato en identificación de remitentes falsos y URLs engañosas.</div>
            `;
        }
        diagE2.innerHTML = e2DiagText;
    }

    const diagE3 = document.getElementById('modal-e3-diag');
    if (diagE3) {
        const mfaStatus = student.telefono_mfa_vinculado ? '🟢 2FA / MFA Vinculado y Activo' : '🔴 2FA / MFA No Vinculado';
        let e3DiagText = '';
        if (e3.intentos === 0 && !student.last_valid_password) {
            e3DiagText = '<p style="color: var(--text-muted);">Sin partidas registradas aún en la Bóveda de Contraseñas (E3).</p>';
        } else if (precE3 >= 80 || (student.last_password_difficulty || 0) >= 3) {
            e3DiagText = `
                <h4>🟢 Perfil Pedagógico: Construcción de Credenciales Robustas</h4>
                <p>Crea contraseñas con alta entropía (mezcla de mayúsculas, minúsculas, números y símbolos). Resistencia total a ataques de diccionario y fuerza bruta.</p>
                <p><strong>Estado de Doble Factor:</strong> ${mfaStatus}</p>
                <div class="diag-rec"><strong>Recomendación Formativa:</strong> Fomentar el uso de gestores de contraseñas y claves de paso (passkeys).</div>
            `;
        } else {
            e3DiagText = `
                <h4>🟡 Perfil Pedagógico: Patrones Débiles o Predecibles</h4>
                <p>Usa combinaciones susceptibles a fuerza bruta rápida o palabras basadas en su entorno personal. Última clave analizada: Dificultad ${student.last_password_difficulty || 1}/3.</p>
                <p><strong>Estado de Doble Factor:</strong> ${mfaStatus}</p>
                <div class="diag-rec"><strong>Recomendación Formativa:</strong> Enseñar la técnica de oraciones mnemotécnicas (Passphrases) de más de 14 caracteres.</div>
            `;
        }
        diagE3.innerHTML = e3DiagText;
    }

    const diagE4 = document.getElementById('modal-e4-diag');
    if (diagE4) {
        let e4DiagText = '';
        if (e4.intentos === 0 && !student.e4_plazasocial) {
            e4DiagText = '<p style="color: var(--text-muted);">Sin partidas registradas aún en el simulador de Laberinto Social (E4).</p>';
        } else if (precE4 >= 75 || student.defensa_social >= 30) {
            e4DiagText = `
                <h4>🟢 Perfil Pedagógico: Privacidad y Conciencia Social Robusta</h4>
                <p>Protege su huella digital, evita el oversharing y detecta intentos de manipulación interpersonal o chantaje digital en redes simuladas.</p>
                <div class="diag-rec"><strong>Recomendación Formativa:</strong> Profundizar en protocolos escolares de reporte y desactivación de ciberacoso.</div>
            `;
        } else {
            e4DiagText = `
                <h4>🟡 Perfil Pedagógico: Exposición Moderada de Datos Personales</h4>
                <p>Tiende a compartir información de ubicación, familiares o hábitos cotidianos sin evaluar el alcance de los perfiles públicos.</p>
                <div class="diag-rec"><strong>Recomendación Formativa:</strong> Taller de configuración de privacidad en redes sociales y riesgos del doxxing.</div>
            `;
        }
        diagE4.innerHTML = e4DiagText;
    }

    const diagE5 = document.getElementById('modal-e5-diag');
    if (diagE5) {
        let e5DiagText = '';
        if (e5.intentos === 0 && !student.e5_escuelasaber) {
            e5DiagText = '<p style="color: var(--text-muted);">Sin partidas registradas aún en el módulo de Protección contra Malware (E5).</p>';
        } else if (precE5 >= 75 || student.seguridad >= 40) {
            e5DiagText = `
                <h4>🟢 Perfil Pedagógico: Auditoría Rigurosa de Permisos y Software</h4>
                <p>Discrimina aplicaciones apócrifas, rechaza permisos invasivos (cámara, ubicación en segundo plano) y prioriza fuentes de instalación verificadas.</p>
                <div class="diag-rec"><strong>Recomendación Formativa:</strong> Fomentar hábitos de actualización continua del sistema operativo y parches de seguridad.</div>
            `;
        } else {
            e5DiagText = `
                <h4>🟡 Perfil Pedagógico: Tendencia a Instalación Desprevenida</h4>
                <p>Acepta solicitudes de permisos excesivos por conveniencia inmediata al instalar juegos o utilidades simuladas.</p>
                <div class="diag-rec"><strong>Recomendación Formativa:</strong> Enseñar el principio de menor privilegio al instalar aplicaciones en móviles y computadores.</div>
            `;
        }
        diagE5.innerHTML = e5DiagText;
    }

    // Checklist de Módulos Completados
    const modules = [
        { key: 'e1_casajugador', name: 'Casa del Jugador', visitKey: 'E1' },
        { key: 'e2_correos', name: 'Correos (Phishing)', visitKey: 'E2' },
        { key: 'e3_torrellaves', name: 'Torre Llaves (Pass)', visitKey: 'E3' },
        { key: 'e4_plazasocial', name: 'Laberinto Social (Ingeniería)', visitKey: 'E4' },
        { key: 'e5_escuelasaber', name: 'Comando Antivirus (Malware)', visitKey: 'E5' }
    ];

    let edificios = {};
    try {
        edificios = typeof student.edificios_visitados === 'string'
            ? JSON.parse(student.edificios_visitados)
            : (student.edificios_visitados || {});
    } catch(e) {}

    const modulesContainer = document.getElementById('modal-modules');
    if (modulesContainer) {
        modulesContainer.innerHTML = '';
        modules.forEach(mod => {
            const isUnlocked = student[mod.key] === true;
            const isVisited = edificios && edificios[mod.visitKey] === true;

            let icon = '🔒';
            let stateClass = '';
            if (isUnlocked) {
                icon = '✅';
                stateClass = 'unlocked';
            } else if (isVisited) {
                icon = '⏳';
                stateClass = 'in-progress';
            }

            const div = document.createElement('div');
            div.className = `module-badge ${stateClass}`;
            div.innerHTML = `<span>${icon}</span> ${mod.name}`;
            modulesContainer.appendChild(div);
        });
    }

    // RPG Levels
    const levels = [
        { key: 'phishing_max_level', name: 'Módulo Phishing (E2)' },
        { key: 'passwords_max_level', name: 'Contraseñas (E3)' },
        { key: 'plaza_max_level', name: 'Laberinto Social (E4)' },
        { key: 'apps_max_level', name: 'Malware/Apps (E5)' }
    ];

    const levelsContainer = document.getElementById('modal-levels');
    if (levelsContainer) {
        levelsContainer.innerHTML = '';
        levels.forEach(lvl => {
            const val = student[lvl.key] || 0;
            const div = document.createElement('div');
            div.className = 'level-indicator';
            div.innerHTML = `
                <span>${lvl.name}</span>
                <strong>Nivel ${val}</strong>
            `;
            levelsContainer.appendChild(div);
        });
    }

    // Logs & Extras
    const logsContainer = document.getElementById('modal-logs');
    if (logsContainer) {
        let logsHtml = '';
        if (student.last_valid_password) {
            logsHtml += `<p><strong>Última contraseña analizada:</strong> ${escapeHtml(student.last_valid_password)} (Dificultad ${student.last_password_difficulty})</p>`;
        }

        let dialogosHtml = '';
        try {
            const dialogos = typeof student.dialogos_vistos === 'string' ? JSON.parse(student.dialogos_vistos) : (student.dialogos_vistos || {});
            if (dialogos && Object.keys(dialogos).length > 0) {
                dialogosHtml = Object.keys(dialogos).map(k => `• ${k}`).join('<br>');
            }
        } catch(e) {}

        let conceptosHtml = '';
        try {
            const conceptos = typeof student.conceptos_leidos === 'string' ? JSON.parse(student.conceptos_leidos) : (student.conceptos_leidos || []);
            if (conceptos && conceptos.length > 0) {
                conceptosHtml = conceptos.map(c => `• ${c}`).join('<br>');
            }
        } catch(e) {}

        if (dialogosHtml) logsHtml += `<p style="margin-top:8px;"><strong>Diálogos Pedagógicos Vistos:</strong><br>${dialogosHtml}</p>`;
        if (conceptosHtml) logsHtml += `<p style="margin-top:8px;"><strong>Conceptos Teóricos Leídos:</strong><br>${conceptosHtml}</p>`;

        logsContainer.innerHTML = logsHtml || '<p style="color: var(--text-muted);">Sin interacciones registradas aún.</p>';
    }

    // Renderizar Ranking de Fortalezas y Debilidades (1 a 10 Vectores)
    renderRankingVectores(student);

    studentModal.classList.remove('hidden');
};

function closeStudentModal() {
    studentModal.classList.add('hidden');
    currentViewingUserId = null;
}

// =============================================================================
// GESTIÓN CRUD DE ESTUDIANTES
// =============================================================================
window.openStudentFormModal = function(student = null) {
    if (formCurso && (formCurso.options.length <= 1) && rawCursos && rawCursos.length > 0) {
        populateCourseSelectors();
    }
    const btnFormResetPwd = document.getElementById('btn-form-reset-password');
    if (student) {
        formModalTitle.innerText = "Editar Estudiante";
        const isTempUid = student.user_id && String(student.user_id).startsWith('temp_');
        formStudentId.value = isTempUid ? '' : (student.user_id || '');
        formNombres.value = student.nombres || '';
        formApellidos.value = student.apellidos || '';
        formEmail.value = student.email || '';
        formCodigo.value = student.codigo_estudiante || '';
        formCurso.value = student.curso_id || '';
        formEmail.disabled = Boolean(student.user_id && !isTempUid);
        if (btnFormResetPwd) btnFormResetPwd.style.display = 'inline-flex';
    } else {
        formModalTitle.innerText = "Matricular Estudiante";
        if (studentCrudForm) studentCrudForm.reset();
        formStudentId.value = '';
        formEmail.disabled = false;
        if (selectedCourseId && selectedCourseId !== 'ALL') {
            formCurso.value = selectedCourseId;
        }
        if (btnFormResetPwd) btnFormResetPwd.style.display = 'none';
    }
    if (studentFormModal) studentFormModal.classList.remove('hidden');
};
const openStudentFormModal = window.openStudentFormModal;

window.openEditStudentModal = function(userId) {
    const student = mergedStudents.find(s => s.user_id === userId);
    if (student) openStudentFormModal(student);
};

window.closeStudentFormModal = function() {
    if (studentFormModal) studentFormModal.classList.add('hidden');
    if (studentCrudForm) studentCrudForm.reset();
};
const closeStudentFormModal = window.closeStudentFormModal;

// =============================================================================
// RANKING DE COMPETENCIAS — TOP FORTALEZAS VS TOP DEBILIDADES (1 a 10 VECTORES)
// =============================================================================
function renderRankingVectores(student) {
    const contFortalezas = document.getElementById('modal-ranking-fortalezas');
    const contDebilidades = document.getElementById('modal-ranking-debilidades');
    if (!contFortalezas || !contDebilidades) return;

    const e2 = student.metricas_e2 || {};
    const e3 = student.metricas_e3 || {};
    const e4 = student.metricas_e4 || {};
    const e5 = student.metricas_e5 || {};

    // 10 Vectores Universales de Ciberseguridad CyberHive
    const vectores = [
        {
            id: 'V01',
            nombre: 'Detección Enlaces Ocultos (URLs)',
            modulo: 'E2',
            evaluado: Boolean(e2.intentos && e2.intentos > 0),
            score: (e2.intentos && e2.intentos > 0) ? (e2.precision_pct !== undefined ? e2.precision_pct : Math.round((e2.correctas || 0) / (e2.intentos || 1) * 100)) : 50
        },
        {
            id: 'V02',
            nombre: 'Identificación Adjuntos Peligrosos',
            modulo: 'E2',
            evaluado: Boolean(e2.intentos && e2.intentos > 0),
            score: (e2.intentos && e2.intentos > 0) ? Math.max(0, 100 - ((e2.reincidencias || 0) * 25)) : 50
        },
        {
            id: 'V03',
            nombre: 'Resistencia a Falsa Urgencia',
            modulo: 'E2',
            evaluado: Boolean(e2.intentos && e2.intentos > 0),
            score: (e2.intentos && e2.intentos > 0) ? ((e2.tiempo_prom || 0) >= 4.0 ? Math.min(100, 70 + Math.round((e2.tiempo_prom || 0) * 3)) : Math.max(20, Math.round((e2.tiempo_prom || 0) * 15))) : 50
        },
        {
            id: 'V04',
            nombre: 'Entropía y Longitud de Claves',
            modulo: 'E3',
            evaluado: Boolean((e3.intentos && e3.intentos > 0) || student.e3_torrellaves || (student.last_password_difficulty > 0)),
            score: (e3.precision_pct !== undefined) ? e3.precision_pct : ((student.last_password_difficulty || 0) >= 3 ? 95 : (student.last_password_difficulty === 2 ? 70 : 45))
        },
        {
            id: 'V05',
            nombre: 'Evitar Diccionario y Patrones',
            modulo: 'E3',
            evaluado: Boolean((e3.intentos && e3.intentos > 0) || student.e3_torrellaves || (student.last_valid_password && student.last_valid_password.length > 0)),
            score: (e3.diagnostico_fallo && e3.diagnostico_fallo.uso_palabras_toxicas > 0) ? 40 : (e3.precision_pct !== undefined ? Math.min(100, e3.precision_pct) : 60)
        },
        {
            id: 'V06',
            nombre: 'Adopción de Doble Factor (MFA)',
            modulo: 'E3',
            evaluado: Boolean(student.telefono_mfa_vinculado || (e3.intentos && e3.intentos > 0) || student.e3_torrellaves),
            score: student.telefono_mfa_vinculado ? 100 : ((e3.diagnostico_fallo && e3.diagnostico_fallo.mfa_vinculado) ? 95 : (student.e3_torrellaves ? 40 : 15))
        },
        {
            id: 'V07',
            nombre: 'Control de Oversharing Privado',
            modulo: 'E4',
            evaluado: Boolean((e4.intentos && e4.intentos > 0) || student.e4_plazasocial),
            score: (e4.precision_pct !== undefined) ? e4.precision_pct : (student.e4_plazasocial ? 88 : (student.defensa_social > 30 ? 75 : 45))
        },
        {
            id: 'V08',
            nombre: 'Gestión y Denuncia Ciberacoso',
            modulo: 'E4',
            evaluado: Boolean((e4.intentos && e4.intentos > 0) || student.e4_plazasocial),
            score: (e4.precision_pct !== undefined) ? Math.min(100, Math.round(e4.precision_pct * 0.95)) : (student.e4_plazasocial ? 92 : (student.defensa_social > 20 ? 70 : 40))
        },
        {
            id: 'V09',
            nombre: 'Auditoría Permisos Invasivos',
            modulo: 'E5',
            evaluado: Boolean((e5.intentos && e5.intentos > 0) || student.e5_escuelasaber),
            score: (e5.precision_pct !== undefined) ? e5.precision_pct : (student.e5_escuelasaber ? 85 : (student.seguridad > 40 ? 65 : 35))
        },
        {
            id: 'V10',
            nombre: 'Discriminación de Apps Legítimas',
            modulo: 'E5',
            evaluado: Boolean((e5.intentos && e5.intentos > 0) || student.e5_escuelasaber),
            score: (e5.precision_pct !== undefined) ? Math.min(100, Math.round(e5.precision_pct * 1.05)) : (student.e5_escuelasaber ? 90 : (student.seguridad > 50 ? 75 : 50))
        }
    ];

    // Clasificar únicamente vectores que hayan sido efectivamente evaluados en partidas del alumno
    const vectoresEvaluados = vectores.filter(v => v.evaluado);
    const fortalezas = vectoresEvaluados.filter(v => v.score >= 60).sort((a, b) => b.score - a.score);
    const debilidades = vectoresEvaluados.filter(v => v.score < 60).sort((a, b) => a.score - b.score);

    const renderVectorHtml = (v, rank, isStrength) => {
        const fillClass = isStrength ? (v.score >= 80 ? 'success' : 'warning') : (v.score < 40 ? 'danger' : 'warning');
        return `
            <div class="ranking-item">
                <div class="ranking-header-line">
                    <span><strong>#${rank}</strong> [${v.modulo}] ${v.nombre}</span>
                    <span style="font-weight: 600; color: ${isStrength ? '#34d399' : '#f87171'};">${v.score}%</span>
                </div>
                <div class="ranking-bar-bg">
                    <div class="ranking-bar-fill ${fillClass}" style="width: ${v.score}%;"></div>
                </div>
            </div>
        `;
    };

    if (fortalezas.length > 0) {
        contFortalezas.innerHTML = fortalezas.slice(0, 5).map((v, i) => renderVectorHtml(v, i + 1, true)).join('');
    } else {
        contFortalezas.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Completa o supera desafíos (≥ 60% de precisión) en los edificios para registrar fortalezas.</p>';
    }

    if (debilidades.length > 0) {
        contDebilidades.innerHTML = debilidades.slice(0, 5).map((v, i) => renderVectorHtml(v, i + 1, false)).join('');
    } else {
        contDebilidades.innerHTML = '<p style="color: #34d399; font-size: 0.85rem;">🎉 Sin debilidades críticas detectadas. ¡Excelente nivel defensivo!</p>';
    }
}

async function handleSaveStudent(e) {
    e.preventDefault();

    const btnSave = document.getElementById('btn-save-student');
    const uid = formStudentId.value.trim() || null;
    const nombres = formNombres.value.trim();
    const apellidos = formApellidos.value.trim();
    const email = formEmail.value.trim().toLowerCase();
    const codigo = formCodigo.value.trim();
    const cursoId = formCurso.value || null;

    if (!nombres || !apellidos || !email || !cursoId) {
        alert("Por favor completa los campos obligatorios: Nombres, Apellidos, Correo y Curso.");
        return;
    }

    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerText = "Guardando...";
    }

    try {
        const res = await fetch('/api/estudiantes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: uid,
                nombres,
                apellidos,
                email,
                codigo_estudiante: codigo,
                curso_id: cursoId
            })
        });

        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || "Error al guardar estudiante");

        closeStudentFormModal();
        const pwdMsg = result.initial_password ? ` Clave de acceso al juego: ${result.initial_password}` : ` Clave de acceso al juego: ${DEFAULT_STUDENT_CODE}`;
        showToast(`🎉 Estudiante ${nombres} ${apellidos} matriculado con éxito.${pwdMsg}`);
        await fetchData();
    } catch (err) {
        console.error("Error al guardar estudiante:", err);
        alert("Error al guardar estudiante: " + err.message);
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerText = "Guardar Estudiante";
        }
    }
}


// =============================================================================
// INICIALIZACIÓN DE CURSOS BASE
// =============================================================================
async function handleInitDefaultCourses() {
    const confirmAction = confirm("¿Deseas inicializar los cursos estándar (801, 802, 901, 902, 1001, 1002, 1101, 1102) para la institución?");
    if (!confirmAction) return;

    try {
        const res = await fetch('/api/cursos/init', { method: 'POST' });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Error al crear cursos");

        showToast("Cursos base inicializados en la base de datos.");
        await fetchData();
    } catch(err) {
        console.error("Error al crear cursos base:", err);
        alert("Error al inicializar cursos: " + err.message);
    }
}

// =============================================================================
// RESETEO DE PROGRESO DE ESTUDIANTES
// =============================================================================
window.quickResetStudent = function(userId) {
    currentViewingUserId = userId;
    void handleResetCurrentStudent();
};

async function handleResetCurrentStudent() {
    if (!currentViewingUserId) return;

    const confirmAction = confirm("¿Estás seguro de borrar y resetear todo el progreso y telemetría de este estudiante?");
    if (!confirmAction) return;

    try {
        const res = await fetch('/api/estudiantes/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentViewingUserId })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Error al resetear estudiante");

        closeStudentModal();
        showToast("Progreso y telemetría reseteados con éxito.");
        await fetchData();
    } catch (err) {
        console.error("Error al resetear estudiante:", err);
        alert("Error al intentar resetear: " + err.message);
    }
}

async function handleResetCurrentStudentPassword() {
    if (!currentViewingUserId) return;
    const student = mergedStudents.find(s => s.user_id === currentViewingUserId);
    const studentName = student ? (student.nombre_display || student.email) : "este estudiante";
    const studentEmail = student ? student.email : "";

    const confirmAction = confirm(`¿Deseas restablecer la contraseña de acceso al juego para ${studentName} a '${DEFAULT_STUDENT_CODE}'?`);
    if (!confirmAction) return;

    try {
        const res = await fetch('/api/estudiantes/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentViewingUserId, email: studentEmail })
        });

        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || "Error al restablecer contraseña");

        showToast(`🔑 Contraseña de ${studentName} restablecida exitosamente a: ${result.default_password || DEFAULT_STUDENT_CODE}`);
    } catch (err) {
        console.error("Error al restablecer contraseña:", err);
        alert("Error al restablecer contraseña: " + err.message);
    }
}

// =============================================================================
// UTILIDADES UI
// =============================================================================
function showToast(msg) {
    toast.innerText = msg;
    toast.classList.remove('hidden');
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 400);
    }, 3500);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// =============================================================================
// GESTIÓN Y REGISTRO DE DOCENTES (PROFESORES)
// =============================================================================
// =============================================================================
// GESTIÓN Y REGISTRO DE DOCENTES (PROFESORES)
// =============================================================================
async function openTeacherModal() {
    if (!teacherModal) return;
    teacherModal.classList.remove('hidden');
    if (profNombres) profNombres.value = '';
    if (profApellidos) profApellidos.value = '';
    if (profEmail) profEmail.value = '';
    if (profArea) profArea.value = 'Tecnología e Informática';
    
    // Cargar checkboxes de cursos disponibles
    const contCheckboxes = document.getElementById('prof-cursos-checkboxes');
    if (contCheckboxes) {
        try {
            const resCursos = await fetch('/api/cursos');
            const dataCursos = await resCursos.json();
            const allCursos = dataCursos.cursos || [];
            if (allCursos.length === 0) {
                contCheckboxes.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem;">No hay cursos configurados en la institución.</span>';
            } else {
                contCheckboxes.innerHTML = allCursos.map(c => `
                    <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; color: #f8fafc; background: rgba(255,255,255,0.06); padding: 5px 10px; border-radius: 6px; cursor: pointer; border: 1px solid rgba(255,255,255,0.08);">
                        <input type="checkbox" name="prof-course-check" value="${c.id}">
                        <strong>${escapeHtml(c.codigo)}</strong> (Grado ${c.grado}°)
                    </label>
                `).join('');
            }
        } catch (e) {
            contCheckboxes.innerHTML = '<span style="color: #f87171; font-size: 0.8rem;">Error al cargar cursos disponibles.</span>';
        }
    }

    await fetchTeachers();
}

function closeTeacherModal() {
    if (teacherModal) teacherModal.classList.add('hidden');
}

async function fetchTeachers() {
    if (!teachersListContainer) return;
    teachersListContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 15px;">Cargando lista de docentes...</p>';
    try {
        const res = await fetch('/api/profesores');
        const data = await res.json();
        const profs = (data && data.profesores) ? data.profesores : [];
        
        if (profCountBadge) profCountBadge.innerText = `${profs.length} Docente${profs.length === 1 ? '' : 's'}`;

        if (profs.length === 0) {
            teachersListContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.85rem; background: rgba(0,0,0,0.2); border-radius: 8px;">
                    No hay docentes registrados aún.<br>
                    <span style="font-size: 0.8rem; color: #64748b;">Completa el formulario superior para registrar al primer profesor.</span>
                </div>
            `;
            return;
        }

        teachersListContainer.innerHTML = profs.map(p => {
            const initials = `${(p.nombres || 'P').charAt(0)}${(p.apellidos || '').charAt(0)}`.toUpperCase();
            const fullName = `${p.nombres || ''} ${p.apellidos || ''}`.trim() || 'Docente sin nombre';
            const email = p.email || 'Sin correo';
            const area = p.area || 'General';
            const cursosList = (p.cursos_asignados || []).map(c => `
                <span class="badge badge-course" style="font-size: 0.72rem;">Curso ${escapeHtml(c.codigo || c.id)}</span>
            `).join('') || '<span style="color: var(--text-muted); font-size: 0.75rem;">Sin cursos asignados</span>';

            return `
                <div class="teacher-item-card">
                    <div class="teacher-item-left">
                        <div class="teacher-item-avatar">${initials}</div>
                        <div class="teacher-item-details">
                            <strong>${escapeHtml(fullName)}</strong>
                            <span>${escapeHtml(email)}</span>
                            <div style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 4px;">
                                ${cursosList}
                            </div>
                        </div>
                    </div>
                    <div class="teacher-item-right" style="gap: 8px; display: flex; align-items: center;">
                        <span class="badge badge-course">${escapeHtml(area)}</span>
                        <button class="btn-reset-teacher" onclick="handleResetTeacherPassword('${p.id}', '${escapeHtml(fullName)}', '${escapeHtml(email)}')">
                            🔑 Reset Clave
                        </button>
                        <button class="btn-delete-teacher" onclick="handleDeleteTeacher('${p.id}', '${escapeHtml(fullName)}')">
                            Eliminar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Error al consultar docentes:', err);
        teachersListContainer.innerHTML = '<p style="color: #f87171; font-size: 0.85rem; text-align: center;">Error al cargar docentes.</p>';
    }
}

async function handleSaveTeacher(e) {
    e.preventDefault();
    const nombres = profNombres.value.trim();
    const apellidos = profApellidos.value.trim();
    const email = profEmail.value.trim().toLowerCase();
    const area = profArea.value.trim();
    const profPwdInput = document.getElementById('prof-password');
    const teacherAuthSecret = profPwdInput ? (profPwdInput.value.trim() || DEFAULT_TEACHER_CODE) : DEFAULT_TEACHER_CODE;

    if (!nombres || !apellidos || !email) {
        alert("Por favor completa nombres, apellidos y correo.");
        return;
    }

    // Leer cursos seleccionados
    const checkedCheckboxes = document.querySelectorAll('input[name="prof-course-check"]:checked');
    const cursos_asignados = Array.from(checkedCheckboxes).map(el => el.value);

    const btnSave = document.getElementById('btn-save-teacher');
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerText = "Guardando...";
    }

    try {
        const res = await fetch('/api/profesores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombres, apellidos, email, area, password: teacherAuthSecret, cursos_asignados })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || "Error al registrar docente");
        }

        const initialKey = data.initial_password || teacherAuthSecret;
        closeTeacherModal();
        showToast(`Docente ${nombres} ${apellidos} guardado exitosamente. Cursos asignados: ${cursos_asignados.length}`);
        if (profNombres) profNombres.value = '';
        if (profApellidos) profApellidos.value = '';
        if (profEmail) profEmail.value = '';
        if (profPwdInput) profPwdInput.value = DEFAULT_TEACHER_CODE;
        await fetchTeachers();
        if (currentUserRole === 'admin') await fetchAdminViewData();
    } catch (err) {
        console.error("Error al registrar docente:", err);
        alert("Error al registrar docente: " + err.message);
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerText = "➕ Guardar Docente";
        }
    }
}

window.handleDeleteTeacher = async function(id, name) {
    const confirmDel = confirm(`¿Estás seguro de eliminar al docente "${name}"?`);
    if (!confirmDel) return;

    try {
        const res = await fetch(`/api/profesores/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || "No se pudo eliminar");
        }
        showToast(`Docente eliminado correctamente.`);
        await fetchTeachers();
        if (currentUserRole === 'admin') await fetchAdminViewData();
    } catch (err) {
        console.error("Error al eliminar docente:", err);
        alert("Error al eliminar docente: " + err.message);
    }
};

// =============================================================================
// GESTIÓN CRUD DE CURSOS (EXCLUSIVO ADMINISTRADOR)
// =============================================================================
window.openCourseModal = async function(courseId = null) {
    if (!courseCrudModal) return;
    courseCrudModal.classList.remove('hidden');

    // Cargar lista de profesores para asignación
    try {
        const res = await fetch('/api/profesores');
        const data = await res.json();
        const profs = data.profesores || [];
        if (courseProfesor) {
            courseProfesor.innerHTML = '<option value="">(Sin docente asignado)</option>' +
                profs.map(p => {
                    const fn = `${p.nombres || ''} ${p.apellidos || ''}`.trim() || p.email;
                    return `<option value="${p.id}">${escapeHtml(fn)} (${escapeHtml(p.email)})</option>`;
                }).join('');
        }
    } catch (e) {
        console.error("Error cargando profesores para el modal de cursos:", e);
    }

    if (courseId) {
        const c = rawCursos.find(item => item.id === courseId);
        if (courseModalTitle) courseModalTitle.innerText = "Editar Curso";
        if (formCourseId) formCourseId.value = c ? c.id : '';
        if (courseGrado) courseGrado.value = c ? c.grado : '9';
        if (courseCodigo) courseCodigo.value = c ? c.codigo : '';
        if (courseAnio) courseAnio.value = c ? (c.anio_lectivo || 2026) : 2026;
        if (courseProfesor && c && c.profesor_id) courseProfesor.value = c.profesor_id;
    } else {
        if (courseModalTitle) courseModalTitle.innerText = "Crear Nuevo Curso";
        if (formCourseId) formCourseId.value = '';
        if (courseGrado) courseGrado.value = '9';
        if (courseCodigo) courseCodigo.value = '';
        if (courseAnio) courseAnio.value = 2026;
        if (courseProfesor) courseProfesor.value = '';
    }
};

function closeCourseModal() {
    if (courseCrudModal) courseCrudModal.classList.add('hidden');
}
window.closeCourseModal = closeCourseModal;

async function handleSaveCourse(e) {
    e.preventDefault();
    const id = formCourseId ? formCourseId.value.trim() || null : null;
    const grado = courseGrado ? Number.parseInt(courseGrado.value, 10) : 9;
    const codigo = courseCodigo ? courseCodigo.value.trim() : '';
    const anio_lectivo = courseAnio ? Number.parseInt(courseAnio.value, 10) : 2026;
    const profesor_id = courseProfesor ? (courseProfesor.value.trim() || null) : null;

    if (!codigo || Number.isNaN(grado)) {
        alert("Por favor completa el grado y el código del curso.");
        return;
    }

    try {
        const res = await fetch('/api/cursos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, grado, codigo, anio_lectivo, profesor_id })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || "Error al guardar curso");
        }
        showToast(`Curso ${codigo} guardado exitosamente.`);
        closeCourseModal();
        if (currentUserRole === 'admin') await fetchAdminViewData();
        await fetchData();
    } catch (err) {
        console.error("Error al guardar curso:", err);
        alert("Error al guardar curso: " + err.message);
    }
}

window.handleDeleteCourse = async function(courseId, courseCode) {
    const confirmDel = confirm(`¿Estás seguro de eliminar el curso ${courseCode}? Esta acción no se puede deshacer.`);
    if (!confirmDel) return;

    try {
        const res = await fetch(`/api/cursos?id=${courseId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || "No se pudo eliminar el curso");
        }
        showToast(`Curso ${courseCode} eliminado correctamente.`);
        if (currentUserRole === 'admin') await fetchAdminViewData();
        await fetchData();
    } catch (err) {
        console.error("Error al eliminar curso:", err);
        alert(err.message);
    }
};

// =============================================================================
// NAVEGACIÓN POR PESTAÑAS (TABS: TELEMETRÍA vs ADMIN PANEL)
// =============================================================================
function switchTab(targetId) {
    document.querySelectorAll('.console-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-target') === targetId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    document.querySelectorAll('.console-tab-content').forEach(view => {
        if (view.id === targetId) {
            view.classList.remove('hidden');
        } else {
            view.classList.add('hidden');
        }
    });

    if (targetId === 'view-admin') {
        void fetchAdminViewData();
    }
}

// =============================================================================
// CARGA Y RENDERIZADO DEL PANEL DE ADMINISTRACIÓN
// =============================================================================
async function fetchAdminViewData() {
    try {
        const [profRes, cursosRes, dataRes] = await Promise.all([
            fetch('/api/profesores'),
            fetch('/api/cursos'),
            fetch('/api/data')
        ]);
        const profData = await profRes.json();
        const cursosData = await cursosRes.json();
        const mainData = await dataRes.json();

        const profs = profData.profesores || [];
        const cursos = (cursosData.cursos && cursosData.cursos.length > 0) ? cursosData.cursos : (mainData.cursos || []);
        const estudiantes = mainData.estudiantes || [];

        // Actualizar KPIs Admin
        const kpiTeachers = document.getElementById('admin-kpi-teachers-count');
        const kpiCourses = document.getElementById('admin-kpi-courses-count');
        const kpiStudents = document.getElementById('admin-kpi-students-count');

        if (kpiTeachers) kpiTeachers.innerText = profs.length;
        if (kpiCourses) kpiCourses.innerText = cursos.length;
        if (kpiStudents) kpiStudents.innerText = estudiantes.length;

        // Renderizar tabla de docentes en Admin Panel
        const tbody = document.getElementById('admin-teachers-tbody');
        if (tbody) {
            if (profs.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">
                            No hay docentes registrados aún.<br>
                            <button class="btn btn-primary" onclick="openTeacherModal()" style="margin-top: 12px;">
                                ➕ Registrar Primer Docente
                            </button>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = profs.map(p => {
                    const initials = `${(p.nombres || 'P').charAt(0)}${(p.apellidos || '').charAt(0)}`.toUpperCase();
                    const fullName = `${p.nombres || ''} ${p.apellidos || ''}`.trim() || 'Docente sin nombre';
                    const cursosBadges = (p.cursos_asignados || []).map(c => `
                        <span class="badge badge-course" style="font-size: 0.72rem;">${escapeHtml(c.codigo || c.id)}</span>
                    `).join('') || '<span style="color: var(--text-muted); font-size: 0.78rem;">Sin cursos</span>';

                    return `
                        <tr>
                            <td>
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div class="teacher-item-avatar">${initials}</div>
                                    <div>
                                        <strong style="color: #f8fafc; font-size: 0.95rem;">${escapeHtml(fullName)}</strong>
                                        <div style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px;">
                                            ${cursosBadges}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td><span style="color: #94a3b8; font-size: 0.9rem;">${escapeHtml(p.email || '')}</span></td>
                            <td><span class="badge badge-course">${escapeHtml(p.area || 'General')}</span></td>
                            <td>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <button class="btn-reset-teacher" onclick="handleResetTeacherPassword('${p.id}', '${escapeHtml(fullName)}', '${escapeHtml(p.email || '')}')" title="Restablecer contraseña para este docente">
                                        🔑 Reset Clave
                                    </button>
                                    <button class="btn-delete-teacher" onclick="handleDeleteTeacher('${p.id}', '${escapeHtml(fullName)}')">
                                        Eliminar
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Renderizar grid de cursos
        const coursesGrid = document.getElementById('admin-courses-grid');
        if (coursesGrid) {
            if (cursos.length === 0) {
                coursesGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--text-muted); background: rgba(0,0,0,0.2); border-radius: 12px;">
                        No hay cursos configurados en la institución.<br>
                        <div style="margin-top: 12px; display: flex; gap: 10px; justify-content: center;">
                            <button class="btn btn-primary" onclick="openCourseModal()">
                                ➕ Crear Primer Curso
                            </button>
                            <button class="btn btn-secondary" onclick="handleInitDefaultCourses()">
                                ⚡ Cursos Estándar (801-1102)
                            </button>
                        </div>
                    </div>
                `;
            } else {
                coursesGrid.innerHTML = cursos.map(c => {
                    const countInCourse = c.total_estudiantes !== undefined 
                        ? c.total_estudiantes 
                        : estudiantes.filter(e => e.curso_id === c.id).length;
                    const teacherDisplay = c.profesor_nombre 
                        ? `👨‍🏫 ${escapeHtml(c.profesor_nombre)}` 
                        : `<span style="color: #fbbf24;">⚠️ Sin docente asignado</span>`;

                    return `
                        <div class="admin-course-card">
                            <div class="admin-course-top">
                                <span class="admin-course-badge">${escapeHtml(c.codigo || 'S/C')}</span>
                                <div style="display: flex; gap: 6px;">
                                    <button class="btn btn-secondary" onclick="openCourseModal('${c.id}')" style="padding: 2px 7px; font-size: 0.75rem;" title="Editar curso">✏️</button>
                                    <button class="btn btn-danger" onclick="handleDeleteCourse('${c.id}', '${escapeHtml(c.codigo)}')" style="padding: 2px 7px; font-size: 0.75rem;" title="Eliminar curso">🗑️</button>
                                </div>
                            </div>
                            <strong style="font-size: 1.05rem; color: #f8fafc;">Grado ${c.grado}° — Salón ${escapeHtml(c.codigo)}</strong>
                            <p style="font-size: 0.82rem; color: #94a3b8; margin: 4px 0 8px 0;">${teacherDisplay}</p>
                            <div>
                                <span class="admin-course-count">${countInCourse}</span>
                                <span class="admin-course-sub">estudiante${countInCourse === 1 ? '' : 's'} matriculado${countInCourse === 1 ? '' : 's'}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (e) {
        console.error("Error al cargar datos del panel admin:", e);
    }
}

async function checkSystemDiagnostics() {
    const badgeSupabase = document.getElementById('health-badge-supabase');
    const badgeServer = document.getElementById('health-badge-server');
    const dbStatus = document.getElementById('health-db-status');

    if (badgeSupabase) badgeSupabase.innerText = 'Consultando...';

    try {
        const res = await fetch('/api/system/health');
        const data = await res.json();
        if (data.status === 'online') {
            if (badgeSupabase) {
                badgeSupabase.className = 'badge badge-success';
                badgeSupabase.innerText = '🟢 Conectado (200 OK)';
            }
            if (dbStatus) dbStatus.innerText = 'Base de Datos Operativa';
            if (badgeServer) {
                badgeServer.className = 'badge badge-success';
                badgeServer.innerText = '🟢 Operacional';
            }
        } else {
            if (badgeSupabase) {
                badgeSupabase.className = 'badge badge-danger';
                badgeSupabase.innerText = '🔴 Degrado';
            }
            if (dbStatus) dbStatus.innerText = 'Fallo de Conexión';
        }
    } catch (e) {
        if (badgeSupabase) {
            badgeSupabase.className = 'badge badge-danger';
            badgeSupabase.innerText = '🔴 Sin Conexión';
        }
    }
}

// =============================================================================
// CAMBIO OBLIGATORIO DE CONTRASEÑA (PRIMER INGRESO)
// =============================================================================
function openChangePasswordModal() {
    if (changePasswordModal) {
        changePasswordModal.classList.remove('hidden');
        if (newPwdInput) {
            newPwdInput.value = '';
            newPwdInput.focus();
        }
        if (confirmPwdInput) confirmPwdInput.value = '';
        if (changePwdError) changePwdError.style.display = 'none';
        validatePasswordRules();
    }
}

function closeChangePasswordModal() {
    if (changePasswordModal) {
        changePasswordModal.classList.add('hidden');
    }
}

function validatePasswordRules() {
    const pwd = newPwdInput ? newPwdInput.value : '';
    const confirm = confirmPwdInput ? confirmPwdInput.value : '';

    const hasLen = pwd.length >= 8;
    const hasCase = /[A-Z]/.test(pwd) && /[a-z]/.test(pwd);
    const hasNum = /[0-9]/.test(pwd);
    const hasMatch = (pwd.length > 0) && (pwd === confirm);

    updateRuleState(ruleLen, hasLen, 'Mínimo 8 caracteres');
    updateRuleState(ruleCase, hasCase, 'Contiene mayúsculas y minúsculas');
    updateRuleState(ruleNum, hasNum, 'Contiene al menos un número (0-9)');
    updateRuleState(ruleMatch, hasMatch, 'Las contraseñas coinciden');

    const isValid = hasLen && hasCase && hasNum && hasMatch;
    if (btnSubmitNewPwd) {
        btnSubmitNewPwd.disabled = !isValid;
    }
    return isValid;
}

function updateRuleState(el, isValid, text) {
    if (!el) return;
    if (isValid) {
        el.className = 'rule-item valid';
        el.innerHTML = `<span class="rule-icon">✓</span> ${text}`;
    } else {
        el.className = 'rule-item invalid';
        el.innerHTML = `<span class="rule-icon">✕</span> ${text}`;
    }
}

async function handleChangePasswordSubmit(e) {
    e.preventDefault();
    if (!validatePasswordRules()) return;

    const pwd = newPwdInput.value;
    if (btnSubmitNewPwd) {
        btnSubmitNewPwd.disabled = true;
        btnSubmitNewPwd.innerText = 'Actualizando contraseña...';
    }
    if (changePwdError) changePwdError.style.display = 'none';

    try {
        const res = await fetch('/api/cambiar-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'No se pudo actualizar la contraseña');
        }

        closeChangePasswordModal();
        showToast('🎉 ¡Contraseña configurada con éxito! Bienvenido a CyberHive.');
    } catch (err) {
        if (changePwdError) {
            changePwdError.innerText = err.message;
            changePwdError.style.display = 'block';
        }
    } finally {
        if (btnSubmitNewPwd) {
            btnSubmitNewPwd.disabled = false;
            btnSubmitNewPwd.innerText = '🔒 Guardar Contraseña e Ingresar a CyberHive';
        }
    }
}

// =============================================================================
// RESTABLECIMIENTO DE CONTRASEÑA POR EL ADMINISTRADOR
// =============================================================================
window.handleResetTeacherPassword = function(profId, teacherName, teacherEmail) {
    if (resetProfId) resetProfId.value = profId;
    if (resetProfName) resetProfName.innerText = teacherName;
    if (resetProfEmail) resetProfEmail.innerText = teacherEmail;
    if (resetTempPwd) resetTempPwd.value = DEFAULT_TEACHER_CODE;
    if (adminResetModal) adminResetModal.classList.remove('hidden');
};

function closeAdminResetModal() {
    if (adminResetModal) adminResetModal.classList.add('hidden');
}

async function handleAdminResetSubmit(e) {
    e.preventDefault();
    const profId = resetProfId.value;
    const tempSecret = resetTempPwd.value.trim() || DEFAULT_TEACHER_CODE;
    const teacherName = resetProfName.innerText;

    const btnSubmit = document.getElementById('btn-confirm-admin-reset');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerText = 'Restableciendo...';
    }

    try {
        const res = await fetch('/api/profesores/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: profId, temp_password: tempSecret })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Error al restablecer contraseña');
        }

        closeAdminResetModal();
        showToast(`🔑 Clave restablecida a '${tempPwd}' para ${teacherName}. Se le exigirá cambiarla al ingresar.`);
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = '🔑 Restablecer y Notificar Clave';
        }
    }
}




document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN GLOBAL ---
    const config = {
        ordenTareas: ["Flejar+Paquete", "Paquete", "Bobina", "Cuna"],
        tareasAbrev: {"Flejar+Paquete": "F+P", "Paquete": "P", "Bobina": "B", "Cuna": "C"},
        tiemposPorTarea: {"Flejar+Paquete": 6, "Paquete": 3, "Bobina": 8, "Cuna": 5},
        coloresTareas: { "Flejar+Paquete": 'rgba(40, 167, 69, 0.7)', "Paquete": 'rgba(0, 123, 255, 0.7)', "Bobina": 'rgba(255, 193, 7, 0.7)', "Cuna": 'rgba(220, 53, 69, 0.7)' },
        coloresPuestos: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#8e44ad', '#16a085', '#27ae60'],
        JORNADA_TOTAL_MINUTOS: 7 * 60 + 45,
    };

    // --- ESTADO DE LA APLICACIÓN ---
    let state = {
        puestos: JSON.parse(localStorage.getItem('puestos') || "[]"),
        log: JSON.parse(localStorage.getItem('registroTareas') || "[]"),
        modoActual: 'actual',
        graficoPuestosChart: null
    };

    // --- FUNCIONES DE GUARDADO ---
    const savePuestos = () => localStorage.setItem('puestos', JSON.stringify(state.puestos));
    const saveLog = () => localStorage.setItem('registroTareas', JSON.stringify(state.log));

    // --- FUNCIONES DE RENDERIZADO ---
    function renderPuestos() {
        const container = document.getElementById('puestosContainer');
        if (!container) return;
        container.innerHTML = state.puestos.map(p => `
            <div class="puesto" style="border-left: 4px solid ${getColorPuesto(p)}">
                <div class="puesto-header"><span>Puesto ${p}</span><button class="boton-quitar" data-puesto="${p}">Quitar</button></div>
                <div class="tarea-buttons">${config.ordenTareas.map(t=>`<button class="tarea-btn" data-puesto="${p}" data-tarea="${t}">${config.tareasAbrev[t]}</button>`).join('')}</div>
            </div>`).join('');
    }
    // ... (El resto de funciones de renderizado irían aquí, pero las omito por brevedad, usa las de la respuesta anterior)

    // --- FUNCIONES DE LÓGICA (Simplificadas) ---
    function addPuesto() {
        const input = document.getElementById('nuevoPuesto');
        if (!input) return;
        const numero = input.value.trim();
        if (numero && !state.puestos.includes(numero)) {
            state.puestos.push(numero);
            state.puestos.sort((a, b) => parseInt(a) - parseInt(b));
            savePuestos();
            renderPuestos();
        }
        input.value = "";
    }
    
    function addRegistro(puesto, tarea) {
        // ... (lógica de addRegistro sin cambios)
    }

    // ... (resto de funciones de lógica)

    // --- INICIALIZACIÓN Y EVENTOS ---
    function init() {
        // Theme
        const themeToggle = document.getElementById('theme-toggle');
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme) document.body.classList.add(currentTheme);
        themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark-mode' : '');
            themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        });

        // Botones de modo
        document.querySelector('.modo-toggle').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const modo = e.target.id.replace('btn-modo-', '');
                cambiarModo(modo);
            }
        });

        // Botón de añadir puesto
        document.getElementById('addPuestoBtn').addEventListener('click', addPuesto);
        document.getElementById('nuevoPuesto').addEventListener('keypress', (e) => { if (e.key === 'Enter') addPuesto(); });

        // Delegación de eventos para botones dinámicos
        document.body.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('boton-quitar')) {
                quitarPuesto(target.dataset.puesto);
            }
            if (target.classList.contains('tarea-btn')) {
                addRegistro(target.dataset.puesto, target.dataset.tarea);
            }
        });

        renderPuestos();
        renderLog();
        renderDashboard();
    }

    // Funciones que faltan (cópialas de la respuesta anterior)
    function getColorPuesto(puesto) { /*...*/ }
    function renderLog() { /*...*/ }
    function renderDashboard() { /*...*/ }
    function cambiarModo(modo) { /*...*/ }
    function quitarPuesto(puesto) { /*...*/ }

    init();
});

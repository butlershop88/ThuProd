// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('SW registrado: ', registration))
            .catch(registrationError => console.log('SW falló: ', registrationError));
    });
}

// PWA Install Prompt
let deferredPrompt;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const dismissBtn = document.getElementById('dismiss-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBanner.style.display = 'block';
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('Usuario aceptó la instalación');
        }
        deferredPrompt = null;
        installBanner.style.display = 'none';
    }
});

dismissBtn.addEventListener('click', () => {
    installBanner.style.display = 'none';
});

// App Logic (mismo que antes pero mejorado para PWA)
document.addEventListener('DOMContentLoaded', () => {
    const tareas = ["Flejar", "Paquete", "Bobina", "Cuna"];
    const tareasAbrev = {"Flejar": "F", "Paquete": "P", "Bobina": "B", "Cuna": "C"};
    const coloresPuestos = [
        '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
        '#1abc9c', '#e67e22', '#8e44ad', '#16a085', '#27ae60'
    ];
    
    let puestos = JSON.parse(localStorage.getItem('puestos') || "[]");
    let log = JSON.parse(localStorage.getItem('registroTareas') || "[]");
    let modoActual = 'actual';

    function savePuestos() { localStorage.setItem('puestos', JSON.stringify(puestos)); }
    function saveLog() { localStorage.setItem('registroTareas', JSON.stringify(log)); }

    function getFechaHoy() { return new Date().toDateString(); }
    function getColorPuesto(puesto) {
        const index = puestos.indexOf(puesto);
        if (index === -1) {
            let hash = 0;
            for (let i = 0; i < puesto.length; i++) { hash = puesto.charCodeAt(i) + ((hash << 5) - hash); }
            return coloresPuestos[Math.abs(hash % coloresPuestos.length)];
        }
        return coloresPuestos[index % coloresPuestos.length];
    }

    function cambiarModo(modo) {
        modoActual = modo;
        document.getElementById('btn-modo-actual').classList.toggle('modo-activo', modo === 'actual');
        document.getElementById('btn-modo-historial').classList.toggle('modo-activo', modo === 'historial');
        document.getElementById('vista-actual').style.display = (modo === 'actual') ? 'block' : 'none';
        document.getElementById('vista-historial').style.display = (modo === 'historial') ? 'block' : 'none';
        if (modo === 'historial') renderHistorial();
    }

    function addPuesto() {
        let nombre = document.getElementById('nuevoPuesto').value.trim();
        if(nombre && !puestos.some(p => p === nombre)) {
            puestos.push(nombre);
            savePuestos();
            renderPuestos();
            // Vibration feedback en móviles
            if ('vibrate' in navigator) navigator.vibrate(50);
        }
        document.getElementById('nuevoPuesto').value = "";
    }
    
    function quitarPuesto(idx) {
        puestos.splice(idx, 1);
        savePuestos();
        renderPuestos();
        renderDashboard();
        if(modoActual === 'historial') renderHistorial();
    }
    
    function addRegistro(puesto, tarea) {
        const now = new Date();
        const hora = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const fecha = now.toDateString();
        const id = Date.now();
        log.unshift({id, hora, fecha, puesto, tarea});
        if(log.length > 500) log.pop();
        saveLog();
        renderLog();
        renderDashboard();
        // Vibration feedback
        if ('vibrate' in navigator) navigator.vibrate(100);
    }
    
    function eliminarRegistro(id) {
        log = log.filter(registro => registro.id !== id);
        saveLog();
        if (modoActual === 'historial') {
            renderHistorial();
        } else {
            renderLog();
            renderDashboard();
        }
    }
    
    function limpiarTodosLosRegistros() {
        if(confirm('¿Estás seguro de que quieres eliminar todos los registros de hoy?')) {
            log = log.filter(registro => registro.fecha !== getFechaHoy());
            saveLog();
            renderLog();
            renderDashboard();
        }
    }
    
    function agruparPorFecha(registros) {
        return registros.reduce((grupos, registro) => {
            if (registro.fecha) {
                if (!grupos[registro.fecha]) grupos[registro.fecha] = [];
                grupos[registro.fecha].push(registro);
            }
            return grupos;
        }, {});
    }
    
    function renderHistorial() {
        const gruposPorFecha = agruparPorFecha(log);
        const fechasOrdenadas = Object.keys(gruposPorFecha).sort((a, b) => new Date(b) - new Date(a));
        let html = '';
        if (fechasOrdenadas.length === 0) {
            html = '<p style="text-align: center; color: var(--text-color);">No hay registros históricos</p>';
        } else {
            fechasOrdenadas.forEach(fecha => {
                const registrosDia = gruposPorFecha[fecha];
                const stats = { totalTareas: registrosDia.length };
                const fechaFormateada = new Date(fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                html += `
                    <div class="dia-grupo">
                        <div class="dia-header"><span>${fechaFormateada}</span><span class="dia-stats">${stats.totalTareas} tareas</span></div>
                        <div class="dia-contenido">
                            <div class="dia-dashboard">${renderDashboardDia(registrosDia)}</div>
                            <div class="dia-registros">${registrosDia.map(reg => `<div class="registro"><span class="registro-texto"><span class="registro-puesto" style="background-color: ${getColorPuesto(reg.puesto)}">${reg.puesto}</span> ${reg.hora} — ${tareasAbrev[reg.tarea] || reg.tarea}</span><button class="boton-eliminar" onclick="window.eliminarRegistroGlobal(${reg.id})">✕</button></div>`).join('')}</div>
                        </div>
                    </div>`;
            });
        }
        document.getElementById('historial-contenido').innerHTML = html;
    }
    
    function renderDashboardDia(registrosDia) {
        const contadorPorPuesto = {};
        registrosDia.forEach(r => {
            if (!contadorPorPuesto[r.puesto]) contadorPorPuesto[r.puesto] = {};
            if (!contadorPorPuesto[r.puesto][r.tarea]) contadorPorPuesto[r.puesto][r.tarea] = 0;
            contadorPorPuesto[r.puesto][r.tarea]++;
        });
        let html = Object.keys(contadorPorPuesto).map(puesto => {
            const color = getColorPuesto(puesto);
            let badges = Object.keys(contadorPorPuesto[puesto]).map(tarea => `<span class="tarea-badge">${tareasAbrev[tarea] || tarea} ${contadorPorPuesto[puesto][tarea]}</span>`).join('');
            return `<div class="puesto-contador" style="background-color: ${color}"><div class="puesto-nombre">${puesto}</div><div class="tareas-contadores">${badges}</div></div>`;
        }).join('');
        return html || '<p style="color: var(--text-color); text-align: center;">No hay registros para este día</p>';
    }
    
    function renderDashboard() {
        document.getElementById('dashboard-contadores').innerHTML = renderDashboardDia(log.filter(r => r.fecha === getFechaHoy()));
    }
    
    function renderPuestos() {
        document.getElementById('puestosContainer').innerHTML = puestos.map((puesto, idx) => {
            const selectId = `select-${idx}`;
            return `
                <div class="puesto" style="border-left: 4px solid ${getColorPuesto(puesto)}">
                    ${puesto}
                    <select id="${selectId}" class="tarea-select">${tareas.map(t => `<option value="${t}">${t}</option>`).join('')}</select>
                    <button class="boton-puesto" onclick="window.addRegistroGlobal('${puesto}', document.getElementById('${selectId}').value)">+</button>
                    <button class="boton-quitar" onclick="window.quitarPuestoGlobal(${idx})">Quitar</button>
                </div>`;
        }).join('');
    }
    
    function renderLog() {
        document.getElementById('log').innerHTML = log.filter(r => r.fecha === getFechaHoy()).slice(0, 30).map(reg => `
            <div class="registro">
                <span class="registro-texto"><span class="registro-puesto" style="background-color: ${getColorPuesto(reg.puesto)}">${reg.puesto}</span> ${reg.hora} — ${tareasAbrev[reg.tarea] || reg.tarea}</span>
                <button class="boton-eliminar" onclick="window.eliminarRegistroGlobal(${reg.id})">✕</button>
            </div>
        `).join('');
    }

    // Exponer funciones globalmente
    window.addRegistroGlobal = addRegistro;
    window.quitarPuestoGlobal = quitarPuesto;
    window.eliminarRegistroGlobal = eliminarRegistro;

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.body.classList.add(currentTheme);
        if (currentTheme === 'dark-mode') themeToggle.textContent = '☀️';
    }
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        let theme = document.body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode';
        themeToggle.textContent = (theme === 'dark-mode') ? '☀️' : '🌙';
        localStorage.setItem('theme', theme);
    });
    
    // Event Listeners
    document.getElementById('btn-modo-actual').addEventListener('click', () => cambiarModo('actual'));
    document.getElementById('btn-modo-historial').addEventListener('click', () => cambiarModo('historial'));
    document.getElementById('addPuestoBtn').addEventListener('click', addPuesto);
    document.getElementById('limpiarRegistrosBtn').addEventListener('click', limpiarTodosLosRegistros);

    // Enter key support
    document.getElementById('nuevoPuesto').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPuesto();
    });

    // Initialize app
    renderPuestos();
    renderLog();
    renderDashboard();
});

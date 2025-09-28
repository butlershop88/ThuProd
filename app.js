// Registrar Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => console.log('SW ok')).catch(err => console.log('SW err', err));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN GLOBAL ---
    const ordenTareas = ["Flejar+Paquete", "Paquete", "Bobina", "Cuna"];
    const tareasAbrev = {"Flejar+Paquete": "F+P", "Paquete": "P", "Bobina": "B", "Cuna": "C"};
    const tiemposPorTarea = {"Flejar+Paquete": 6, "Paquete": 3, "Bobina": 8, "Cuna": 5};
    const coloresPuestos = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#8e44ad', '#16a085', '#27ae60'];
    const coloresTareas = { "Flejar+Paquete": 'rgba(40, 167, 69, 0.7)', "Paquete": 'rgba(0, 123, 255, 0.7)', "Bobina": 'rgba(255, 193, 7, 0.7)', "Cuna": 'rgba(220, 53, 69, 0.7)' };

    // --- ESTADO DE LA APLICACIÓN ---
    let puestos = JSON.parse(localStorage.getItem('puestos') || "[]");
    let log = JSON.parse(localStorage.getItem('registroTareas') || "[]");
    let modoActual = 'actual';
    let graficoPuestosChart;
    const JORNADA_TOTAL_MINUTOS = 7 * 60 + 45;

    // --- FUNCIONES DE GUARDADO ---
    function savePuestos() { localStorage.setItem('puestos', JSON.stringify(puestos)); }
    function saveLog() { localStorage.setItem('registroTareas', JSON.stringify(log)); }

    // --- FUNCIONES DE LÓGICA ---
    function getFechaHoy() { return new Date().toDateString(); }

    function getColorPuesto(puesto) {
        const index = puestos.indexOf(puesto);
        if (index === -1) {
            let hash = 0; for (let i = 0; i < puesto.length; i++) hash = puesto.charCodeAt(i) + ((hash << 5) - hash);
            return coloresPuestos[Math.abs(hash % coloresPuestos.length)];
        }
        return coloresPuestos[index % coloresPuestos.length];
    }
    
    function cambiarModo(modo) {
        modoActual = modo;
        document.querySelectorAll('.modo-toggle button').forEach(btn => btn.classList.remove('modo-activo'));
        document.getElementById(`btn-modo-${modo}`).classList.add('modo-activo');
        document.querySelectorAll('.vista-container').forEach(vista => vista.style.display = 'none');
        document.getElementById(`vista-${modo}`).style.display = 'block';

        if (modo === 'historial') renderHistorial();
        if (modo === 'horas') renderDistribucionHoras();
        if (modo === 'graficas') renderGraficas('daily');
    }

    function addPuesto() {
        let numero = document.getElementById('nuevoPuesto').value.trim();
        if(numero && !puestos.some(p => p === numero)) {
            puestos.push(numero);
            puestos.sort((a, b) => parseInt(a) - parseInt(b));
            savePuestos();
            renderPuestos();
            if ('vibrate' in navigator) navigator.vibrate(50);
        }
        document.getElementById('nuevoPuesto').value = "";
    }
    
    function quitarPuesto(puestoAQuitar) {
        puestos = puestos.filter(p => p !== puestoAQuitar);
        savePuestos();
        renderPuestos();
        renderDashboard();
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
        if ('vibrate' in navigator) navigator.vibrate(100);
    }
    
    function eliminarRegistro(id) {
        log = log.filter(registro => registro.id !== id);
        saveLog();
        renderLog();
        renderDashboard();
        if (modoActual === 'historial') renderHistorial();
        if (modoActual === 'graficas') renderGraficas(document.querySelector('#graficas-filtros button.activo').dataset.periodo);
    }
    
    function limpiarTodosLosRegistros() {
        if(confirm('¿Estás seguro que quieres eliminar los registros de hoy?')) {
            log = log.filter(registro => registro.fecha !== getFechaHoy());
            saveLog();
            renderLog();
            renderDashboard();
        }
    }

    // --- FUNCIONES DE RENDERIZADO ---

    function renderDashboard() {
        const registrosHoy = log.filter(r => r.fecha === getFechaHoy());
        const contador = registrosHoy.reduce((acc, r) => {
            if (!acc[r.puesto]) { acc[r.puesto] = {}; ordenTareas.forEach(t => acc[r.puesto][t] = 0); }
            acc[r.puesto][r.tarea]++;
            return acc;
        }, {});
        let html = Object.keys(contador).length === 0 ? '<p style="color: var(--text-color); text-align: center;">No hay registros aún</p>'
            : `<table class="horas-tabla"><thead><tr><th>Puesto</th>${ordenTareas.map(t=>`<th>${tareasAbrev[t]}</th>`).join('')}</tr></thead><tbody>
                ${Object.keys(contador).sort((a,b)=>parseInt(a)-parseInt(b)).map(p => `<tr><td><span style="display:inline-block;width:12px;height:12px;background:${getColorPuesto(p)};border-radius:2px;margin-right:8px;"></span>P${p}</td>${ordenTareas.map(t=>`<td>${contador[p][t]||0}</td>`).join('')}</tr>`).join('')}
              </tbody></table>`;
        document.getElementById('dashboard-contadores').innerHTML = html;
    }

    function renderPuestos() {
        document.getElementById('puestosContainer').innerHTML = puestos.map(p => `
            <div class="puesto" style="border-left: 4px solid ${getColorPuesto(p)}">
                <div class="puesto-header"><span>Puesto ${p}</span><button class="boton-quitar" onclick="window.quitarPuestoGlobal('${p}')">Quitar</button></div>
                <div class="tarea-buttons">${ordenTareas.map(t=>`<button class="tarea-btn ${t==='Flejar+Paquete'?'combo':''}" onclick="window.addRegistroGlobal('${p}','${t}')">${tareasAbrev[t]}</button>`).join('')}</div>
            </div>`).join('');
    }
    
    function renderLog() {
        document.getElementById('log').innerHTML = log.filter(r => r.fecha === getFechaHoy()).slice(0,30).map(r => `
            <div class="registro"><span><span class="registro-puesto" style="background:${getColorPuesto(r.puesto)}">P${r.puesto}</span> ${r.hora} — ${tareasAbrev[r.tarea]||r.tarea}</span><button class="boton-eliminar" onclick="window.eliminarRegistroGlobal(${r.id})">✕</button></div>
        `).join('');
    }

    function renderHistorial() { /* ...código sin cambios de la versión anterior... */ }
    function renderDistribucionHoras() { /* ...código sin cambios de la versión anterior... */ }
    function filterLogByPeriod(periodo) { /* ...código sin cambios de la versión anterior... */ }
    function renderGraficas(periodo) { /* ...código sin cambios de la versión anterior... */ }


    // --- INICIALIZACIÓN Y EVENT LISTENERS ---

    // Exponer funciones globales para que los onclick dinámicos funcionen
    window.addRegistroGlobal = addRegistro;
    window.quitarPuestoGlobal = quitarPuesto;
    window.eliminarRegistroGlobal = eliminarRegistro;

    // Listener para el cambio de tema
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
        // Volver a renderizar gráficos para que tomen el nuevo color de texto
        if (modoActual === 'graficas') {
            renderGraficas(document.querySelector('#graficas-filtros button.activo').dataset.periodo);
        }
    });
    
    // Listeners para los botones de modo
    ['actual', 'historial', 'horas', 'graficas'].forEach(m => {
        const btn = document.getElementById(`btn-modo-${m}`);
        if(btn) btn.addEventListener('click', () => cambiarModo(m));
    });
    
    // Listeners para los filtros de gráficos
    document.querySelectorAll('#graficas-filtros button').forEach(btn => {
        btn.addEventListener('click', () => renderGraficas(btn.dataset.periodo));
    });

    // Listeners para otros botones
    document.getElementById('addPuestoBtn').addEventListener('click', addPuesto);
    document.getElementById('limpiarRegistrosBtn').addEventListener('click', limpiarTodosLosRegistros);
    document.getElementById('nuevoPuesto').addEventListener('keypress', e => { if (e.key === 'Enter') addPuesto(); });

    // Llamada inicial para renderizar todo
    renderPuestos();
    renderLog();
    renderDashboard();
});

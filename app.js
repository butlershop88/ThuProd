// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('SW registrado: ', registration))
            .catch(registrationError => console.log('SW falló: ', registrationError));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const ordenTareas = ["Flejar+Paquete", "Paquete", "Bobina", "Cuna"];
    const tareasAbrev = {"Flejar+Paquete": "F+P", "Paquete": "P", "Bobina": "B", "Cuna": "C"};
    const tiemposPorTarea = {"Flejar+Paquete": 6, "Paquete": 3, "Bobina": 8, "Cuna": 5};
    const coloresPuestos = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#8e44ad', '#16a085', '#27ae60'];
    
    let puestos = JSON.parse(localStorage.getItem('puestos') || "[]");
    let log = JSON.parse(localStorage.getItem('registroTareas') || "[]");
    let modoActual = 'actual';
    const JORNADA_TOTAL_MINUTOS = 7 * 60 + 45;

    function savePuestos() { localStorage.setItem('puestos', JSON.stringify(puestos)); }
    function saveLog() { localStorage.setItem('registroTareas', JSON.stringify(log)); }

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
        if ('vibrate' in navigator) navigator.vibrate(100);
    }
    
    function eliminarRegistro(id) {
        log = log.filter(registro => registro.id !== id);
        saveLog();
        renderLog();
        renderDashboard();
        if (modoActual === 'historial') renderHistorial();
    }
    
    function limpiarTodosLosRegistros() {
        if(confirm('¿Estás seguro que quieres eliminar los registros de hoy?')) {
            log = log.filter(registro => registro.fecha !== getFechaHoy());
            saveLog();
            renderLog();
            renderDashboard();
        }
    }
    
    function calcularDistribucionHoras() {
        const registrosHoy = log.filter(r => r.fecha === getFechaHoy());
        let tiempoTotalEstimado = 0;
        const contadorPorPuesto = registrosHoy.reduce((acc, r) => {
            if (!acc[r.puesto]) acc[r.puesto] = {};
            if (!acc[r.puesto][r.tarea]) acc[r.puesto][r.tarea] = 0;
            acc[r.puesto][r.tarea]++;
            tiempoTotalEstimado += tiemposPorTarea[r.tarea] || 5;
            return acc;
        }, {});
        
        return Object.keys(contadorPorPuesto).sort((a,b)=>parseInt(a)-parseInt(b)).map(puesto => {
            let tiempoPuesto = 0;
            const detalles = ordenTareas.filter(t=>contadorPorPuesto[puesto][t]).map(t=>`${tareasAbrev[t]} x ${contadorPorPuesto[puesto][t]}`).join(', ');
            Object.keys(contadorPorPuesto[puesto]).forEach(t => tiempoPuesto += contadorPorPuesto[puesto][t]*(tiemposPorTarea[t]||5));
            const minutosAsignados = JORNADA_TOTAL_MINUTOS * (tiempoTotalEstimado > 0 ? tiempoPuesto / tiempoTotalEstimado : 0);
            return {
                puesto, detalles, 
                tiempoEstimado: `${Math.floor(minutosAsignados/60)}h ${Math.round(minutosAsignados%60)}min`,
                tiempoDecimal: (minutosAsignados/60).toFixed(2),
                color: getColorPuesto(puesto)
            };
        });
    }
    
    function renderDistribucionHoras() {
        const distribucion = calcularDistribucionHoras();
        let html = distribucion.length === 0 ? '<p style="text-align: center; color: var(--text-color);">No hay registros para calcular</p>'
            : `<table class="horas-tabla"><thead><tr><th>Puesto</th><th>Tareas</th><th>Tiempo</th><th>Decimal</th></tr></thead><tbody>
                ${distribucion.map(item => `<tr><td><span style="display:inline-block; width:12px; height:12px; background:${item.color}; border-radius:2px; margin-right:8px;"></span>P${item.puesto}</td><td>${item.detalles}</td><td>${item.tiempoEstimado}</td><td><strong>${item.tiempoDecimal.replace('.',' ,')}</strong></td></tr>`).join('')}
              </tbody></table><div style="margin-top: 15px; padding: 10px; background: var(--card-bg); border-radius: 5px; font-size: 12px; color: var(--text-color);">Nota: Esta distribución es una estimación.</div>`;
        document.getElementById('horas-contenido').innerHTML = html;
    }
    
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

    function renderHistorial() {
        const gruposPorFecha = log.reduce((grupos, registro) => {
            if(registro.fecha){
                if (!grupos[registro.fecha]) grupos[registro.fecha] = [];
                grupos[registro.fecha].push(registro);
            }
            return grupos;
        }, {});
        const fechasOrdenadas = Object.keys(gruposPorFecha).sort((a,b) => new Date(b) - new Date(a));
        let html = fechasOrdenadas.length === 0 ? '<p style="text-align: center;">No hay historial</p>' : '';
        fechasOrdenadas.forEach(fecha => {
            const registrosDia = gruposPorFecha[fecha];
            const fechaFormateada = new Date(fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            html += `<div class="dia-grupo"><div class="dia-header"><span>${fechaFormateada}</span><span>${registrosDia.length} tareas</span></div></div>`;
        });
        document.getElementById('historial-contenido').innerHTML = html;
    }

    window.addRegistroGlobal = addRegistro; window.quitarPuestoGlobal = quitarPuesto; window.eliminarRegistroGlobal = eliminarRegistro;

    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) { document.body.classList.add(currentTheme); if (currentTheme === 'dark-mode') themeToggle.textContent = '☀️'; }
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        let theme = document.body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode';
        themeToggle.textContent = (theme === 'dark-mode') ? '☀️' : '🌙';
        localStorage.setItem('theme', theme);
    });
    
    ['actual', 'historial', 'horas'].forEach(m => document.getElementById(`btn-modo-${m}`).addEventListener('click', () => cambiarModo(m)));
    document.getElementById('addPuestoBtn').addEventListener('click', addPuesto);
    document.getElementById('limpiarRegistrosBtn').addEventListener('click', limpiarTodosLosRegistros);
    document.getElementById('nuevoPuesto').addEventListener('keypress', e => { if (e.key === 'Enter') addPuesto(); });

    renderPuestos();
    renderLog();
    renderDashboard();
});

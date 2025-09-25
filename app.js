// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('SW registrado: ', registration))
            .catch(registrationError => console.log('SW falló: ', registrationError));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // TAREAS Y ORDEN DE COLUMNAS DEFINIDO
    const ordenTareas = ["Flejar+Paquete", "Paquete", "Flejar", "Bobina", "Cuna"];
    const tareasAbrev = {"Flejar+Paquete": "F+P", "Paquete": "P", "Flejar": "F", "Bobina": "B", "Cuna": "C"};
    
    const tiemposPorTarea = {
        "Flejar+Paquete": 6,
        "Paquete": 3,
        "Flejar": 2,
        "Bobina": 8,
        "Cuna": 5
    };
    
    const coloresPuestos = [
        '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
        '#1abc9c', '#e67e22', '#8e44ad', '#16a085', '#27ae60'
    ];
    
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
            let hash = 0;
            for (let i = 0; i < puesto.length; i++) { hash = puesto.charCodeAt(i) + ((hash << 5) - hash); }
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
            puestos.sort((a, b) => parseInt(a) - parseInt(b)); // Ordenar puestos numéricamente
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
        if (modoActual === 'historial') renderHistorial();
        else {
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
    
    function calcularDistribucionHoras() {
        const registrosHoy = log.filter(r => r.fecha === getFechaHoy());
        const contadorPorPuesto = {};
        let tiempoTotalEstimado = 0;
        
        registrosHoy.forEach(registro => {
            if (!contadorPorPuesto[registro.puesto]) contadorPorPuesto[registro.puesto] = {};
            if (!contadorPorPuesto[registro.puesto][registro.tarea]) contadorPorPuesto[registro.puesto][registro.tarea] = 0;
            contadorPorPuesto[registro.puesto][registro.tarea]++;
            tiempoTotalEstimado += tiemposPorTarea[registro.tarea] || 5;
        });
        
        const distribucion = [];
        Object.keys(contadorPorPuesto).sort((a, b) => parseInt(a) - parseInt(b)).forEach(puesto => {
            let tiempoPuesto = 0;
            let detalles = ordenTareas.filter(t => contadorPorPuesto[puesto][t])
                                     .map(t => `${tareasAbrev[t]}×${contadorPorPuesto[puesto][t]}`)
                                     .join(', ');
            
            Object.keys(contadorPorPuesto[puesto]).forEach(tarea => {
                tiempoPuesto += contadorPorPuesto[puesto][tarea] * (tiemposPorTarea[tarea] || 5);
            });
            
            const proporcion = tiempoTotalEstimado > 0 ? tiempoPuesto / tiempoTotalEstimado : 0;
            const minutosAsignados = Math.round(JORNADA_TOTAL_MINUTOS * proporcion);
            const horas = Math.floor(minutosAsignados / 60);
            const minutos = minutosAsignados % 60;
            
            distribucion.push({
                puesto,
                detalles,
                tiempoEstimado: `${horas}h ${minutos}min`,
                color: getColorPuesto(puesto)
            });
        });
        
        return distribucion;
    }
    
    function renderDistribucionHoras() {
        const distribucion = calcularDistribucionHoras();
        let html = '';
        
        if (distribucion.length === 0) {
            html = '<p style="text-align: center; color: var(--text-color);">No hay registros para calcular distribución</p>';
        } else {
            html = `<table class="horas-tabla"><thead><tr><th>Puesto</th><th>Tareas realizadas</th><th>Tiempo estimado</th></tr></thead><tbody>
                        ${distribucion.map(item => `<tr>
                                <td><span style="display:inline-block; width:12px; height:12px; background:${item.color}; border-radius:2px; margin-right:8px;"></span>Puesto ${item.puesto}</td>
                                <td>${item.detalles}</td>
                                <td><strong>${item.tiempoEstimado}</strong></td>
                            </tr>`).join('')}
                    </tbody></table>
                <div style="margin-top: 15px; padding: 10px; background: var(--card-bg); border-radius: 5px; font-size: 12px; color: var(--text-color);">
                    💡 <strong>Nota:</strong> Esta distribución es estimativa.
                </div>`;
        }
        
        document.getElementById('horas-contenido').innerHTML = html;
    }
    
    function renderDashboard() {
        const registrosHoy = log.filter(r => r.fecha === getFechaHoy());
        const contadorPorPuesto = {};
        
        registrosHoy.forEach(r => {
            if (!contadorPorPuesto[r.puesto]) contadorPorPuesto[r.puesto] = {};
            ordenTareas.forEach(t => {
                if (!contadorPorPuesto[r.puesto][t]) contadorPorPuesto[r.puesto][t] = 0;
            });
            contadorPorPuesto[r.puesto][r.tarea]++;
        });

        let html = '';
        if (Object.keys(contadorPorPuesto).length === 0) {
            html = '<p style="color: var(--text-color); text-align: center;">No hay registros aún</p>';
        } else {
            html = `<table class="horas-tabla">
                        <thead>
                            <tr>
                                <th>Puesto</th>
                                ${ordenTareas.map(t => `<th>${tareasAbrev[t]}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.keys(contadorPorPuesto).sort((a,b) => parseInt(a) - parseInt(b)).map(puesto => `
                                <tr>
                                    <td><span style="display:inline-block; width:12px; height:12px; background:${getColorPuesto(puesto)}; border-radius:2px; margin-right:8px;"></span>P${puesto}</td>
                                    ${ordenTareas.map(t => `<td>${contadorPorPuesto[puesto][t] || 0}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`;
        }
        
        document.getElementById('dashboard-contadores').innerHTML = html;
    }
    
    function renderPuestos() {
        document.getElementById('puestosContainer').innerHTML = puestos.map((puesto) => `
            <div class="puesto" style="border-left: 4px solid ${getColorPuesto(puesto)}">
                <div class="puesto-header">
                    <span>Puesto ${puesto}</span>
                    <button class="boton-quitar" onclick="window.quitarPuestoGlobal('${puesto}')">Quitar</button>
                </div>
                <div class="tarea-buttons">
                    ${ordenTareas.map(tarea => `
                        <button class="tarea-btn ${tarea === 'Flejar+Paquete' ? 'combo' : ''}" onclick="window.addRegistroGlobal('${puesto}', '${tarea}')">
                            ${tareasAbrev[tarea]}
                        </button>
                    `).join('')}
                </div>
            </div>`).join('');
    }
    
    function renderLog() {
        const registrosHoy = log.filter(r => r.fecha === getFechaHoy()).slice(0, 30);
        document.getElementById('log').innerHTML = registrosHoy.map(reg => `
            <div class="registro">
                <span class="registro-texto"><span class="registro-puesto" style="background-color: ${getColorPuesto(reg.puesto)}">P${reg.puesto}</span> ${reg.hora} — ${tareasAbrev[reg.tarea] || reg.tarea}</span>
                <button class="boton-eliminar" onclick="window.eliminarRegistroGlobal(${reg.id})">✕</button>
            </div>`).join('');
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
    ['actual', 'historial', 'horas'].forEach(modo => {
        document.getElementById(`btn-modo-${modo}`).addEventListener('click', () => cambiarModo(modo));
    });
    document.getElementById('addPuestoBtn').addEventListener('click', addPuesto);
    document.getElementById('limpiarRegistrosBtn').addEventListener('click', limpiarTodosLosRegistros);

    document.getElementById('nuevoPuesto').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPuesto();
    });

    // Initialize app
    renderPuestos();
    renderLog();
    renderDashboard();
});

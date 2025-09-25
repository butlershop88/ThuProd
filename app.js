// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('SW registrado: ', registration))
            .catch(registrationError => console.log('SW falló: ', registrationError));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // NUEVAS TAREAS ACTUALIZADAS
    const tareas = ["Paquete", "Bobina", "Cuna", "Flejar+Paquete"];
    const tareasAbrev = {"Paquete": "P", "Bobina": "B", "Cuna": "C", "Flejar+Paquete": "F+P"};
    
    // Tiempos estimados por tarea (en minutos)
    const tiemposPorTarea = {
        "Paquete": 3,
        "Bobina": 8,
        "Cuna": 5,
        "Flejar+Paquete": 6
    };
    
    const coloresPuestos = [
        '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
        '#1abc9c', '#e67e22', '#8e44ad', '#16a085', '#27ae60'
    ];
    
    let puestos = JSON.parse(localStorage.getItem('puestos') || "[]");
    let log = JSON.parse(localStorage.getItem('registroTareas') || "[]");
    let modoActual = 'actual';
    
    const JORNADA_TOTAL_MINUTOS = 7 * 60 + 45; // 7h 45min

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
        document.getElementById('btn-modo-horas').classList.toggle('modo-activo', modo === 'horas');
        
        document.getElementById('vista-actual').style.display = (modo === 'actual') ? 'block' : 'none';
        document.getElementById('vista-historial').style.display = (modo === 'historial') ? 'block' : 'none';
        document.getElementById('vista-horas').style.display = (modo === 'horas') ? 'block' : 'none';
        
        if (modo === 'historial') renderHistorial();
        if (modo === 'horas') renderDistribucionHoras();
    }

    function addPuesto() {
        let numero = document.getElementById('nuevoPuesto').value.trim();
        if(numero && !puestos.some(p => p === numero)) {
            puestos.push(numero);
            savePuestos();
            renderPuestos();
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
    
    // NUEVA FUNCIÓN: Calcular distribución de horas
    function calcularDistribucionHoras() {
        const registrosHoy = log.filter(r => r.fecha === getFechaHoy());
        const contadorPorPuesto = {};
        let tiempoTotalEstimado = 0;
        
        // Contar tareas por puesto y calcular tiempo total
        registrosHoy.forEach(registro => {
            if (!contadorPorPuesto[registro.puesto]) {
                contadorPorPuesto[registro.puesto] = {};
            }
            if (!contadorPorPuesto[registro.puesto][registro.tarea]) {
                contadorPorPuesto[registro.puesto][registro.tarea] = 0;
            }
            contadorPorPuesto[registro.puesto][registro.tarea]++;
            tiempoTotalEstimado += tiemposPorTarea[registro.tarea] || 5;
        });
        
        // Calcular proporción y distribuir las 7h 45min
        const distribucion = [];
        Object.keys(contadorPorPuesto).forEach(puesto => {
            let tiempoPuesto = 0;
            let detalles = [];
            
            Object.keys(contadorPorPuesto[puesto]).forEach(tarea => {
                const cantidad = contadorPorPuesto[puesto][tarea];
                const tiempoTarea = cantidad * (tiemposPorTarea[tarea] || 5);
                tiempoPuesto += tiempoTarea;
                detalles.push(`${tareasAbrev[tarea]}×${cantidad}`);
            });
            
            // Calcular proporción de la jornada
            const proporcion = tiempoTotalEstimado > 0 ? tiempoPuesto / tiempoTotalEstimado : 0;
            const minutosAsignados = Math.round(JORNADA_TOTAL_MINUTOS * proporcion);
            const horas = Math.floor(minutosAsignados / 60);
            const minutos = minutosAsignados % 60;
            
            distribucion.push({
                puesto,
                detalles: detalles.join(', '),
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
            html = `
                <table class="horas-tabla">
                    <thead>
                        <tr>
                            <th>Puesto</th>
                            <th>Tareas realizadas</th>
                            <th>Tiempo estimado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${distribucion.map(item => `
                            <tr>
                                <td><span style="display:inline-block; width:12px; height:12px; background:${item.color}; border-radius:2px; margin-right:8px;"></span>Puesto ${item.puesto}</td>
                                <td>${item.detalles}</td>
                                <td><strong>${item.tiempoEstimado}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="margin-top: 15px; padding: 10px; background: var(--card-bg); border-radius: 5px; font-size: 12px; color: var(--text-color);">
                    💡 <strong>Nota:</strong> Esta distribución es estimativa basada en: Paquete=3min, Bobina=8min, Cuna=5min, Flejar+Paquete=6min por tarea.
                </div>
            `;
        }
        
        document.getElementById('horas-contenido').innerHTML = html;
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
                            <div class="dia-registros">${registrosDia.map(reg => `<div class="registro"><span class="registro-texto"><span class="registro-puesto" style="background-color: ${getColorPuesto(reg.puesto)}">P${reg.puesto}</span> ${reg.hora} — ${tareasAbrev[reg.tarea] || reg.tarea}</span><button class="boton-eliminar" onclick="window.eliminarRegistroGlobal(${reg.id})">✕</button></div>`).join('')}</div>
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
            return `<div class="puesto-contador" style="background-color: ${color}"><div class="puesto-nombre">P${puesto}</div><div class="tareas-contadores">${badges}</div></div>`;
        }).join('');
        return html || '<p style="color: var(--text-color); text-align: center;">No hay registros para este día</p>';
    }
    
    function renderDashboard() {
        const registrosHoy = log.filter(r => r.fecha === getFechaHoy());
        document.getElementById('dashboard-contadores').innerHTML = renderDashboardDia(registrosHoy);
    }
    
    function renderPuestos() {
        document.getElementById('puestosContainer').innerHTML = puestos.map((puesto, idx) => {
            // Calcular tiempo estimado para este puesto hoy
            const registrosHoy = log.filter(r => r.fecha === getFechaHoy() && r.puesto === puesto);
            let tiempoTotal = 0;
            registrosHoy.forEach(r => tiempoTotal += tiemposPorTarea[r.tarea] || 5);
            const horas = Math.floor(tiempoTotal / 60);
            const minutos = tiempoTotal % 60;
            const tiempoEstimado = tiempoTotal > 0 ? `≈ ${horas}h ${minutos}min` : '';
            
            return `
                <div class="puesto" style="border-left: 4px solid ${getColorPuesto(puesto)}">
                    <div class="puesto-header">
                        <span>Puesto ${puesto}</span>
                        <button class="boton-quitar" onclick="window.quitarPuestoGlobal(${idx})">Quitar</button>
                    </div>
                    <div class="tarea-buttons">
                        ${tareas.map(tarea => `
                            <button class="tarea-btn ${tarea === 'Flejar+Paquete' ? 'combo' : ''}" onclick="window.addRegistroGlobal('${puesto}', '${tarea}')">
                                ${tareasAbrev[tarea]} ${tarea}
                            </button>
                        `).join('')}
                    </div>
                    ${tiempoEstimado ? `<div class="tiempo-estimado">${tiempoEstimado}</div>` : ''}
                </div>`;
        }).join('');
    }
    
    function renderLog() {
        const registrosHoy = log.filter(r => r.fecha === getFechaHoy()).slice(0, 30);
        document.getElementById('log').innerHTML = registrosHoy.map(reg => `
            <div class="registro">
                <span class="registro-texto"><span class="registro-puesto" style="background-color: ${getColorPuesto(reg.puesto)}">P${reg.puesto}</span> ${reg.hora} — ${tareasAbrev[reg.tarea] || reg.tarea}</span>
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
    document.getElementById('btn-modo-horas').addEventListener('click', () => cambiarModo('horas'));
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

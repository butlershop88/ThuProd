document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const config = {
        ordenTareas: ["Flejar+Paquete", "Paquete", "Bobina", "Cuna"],
        abrev: {"Flejar+Paquete": "F+P", "Paquete": "P", "Bobina": "B", "Cuna": "C"},
        tiempos: {"Flejar+Paquete": 6, "Paquete": 3, "Bobina": 8, "Cuna": 5},
        coloresTareas: {"Flejar+Paquete": 'rgba(25, 135, 84, 0.8)', "Paquete": 'rgba(13, 110, 253, 0.8)', "Bobina": 'rgba(255, 193, 7, 0.8)', "Cuna": 'rgba(220, 53, 69, 0.8)'},
        coloresFijosPuestos: ['#FF4D4D', '#4DB3FF', '#6CFF6C', '#FFF04D'], // Rojo, Azul, Verde, Amarillo brillantes
        paletaFosforito: ['#FFAA4D', '#FF6FD8', '#4DFFE5', '#B6FF4D', '#C77DFF', '#4DFFC3', '#FFFFFF', '#FFD966', '#A8E6CF', '#FF8E99'], // Naranja, Rosa, Cian, Lima, Violeta, Turquesa, Blanco, etc.
        JORNADA_MINUTOS: 465
    };

    // --- ESTADO ---
    let state = {
        puestos: JSON.parse(localStorage.getItem('puestos') || '[]'),
        log: JSON.parse(localStorage.getItem('registroTareas') || '[]'),
        colorPuestos: JSON.parse(localStorage.getItem('colorPuestos') || '{}'),
        chartInstance: null
    };

    // --- FUNCIONES DE GUARDADO ---
    const savePuestos = () => localStorage.setItem('puestos', JSON.stringify(state.puestos));
    const saveLog = () => localStorage.setItem('registroTareas', JSON.stringify(state.log));
    const saveColorPuestos = () => localStorage.setItem('colorPuestos', JSON.stringify(state.colorPuestos));
    const getHoy = () => new Date().toDateString();
    
    // --- UTILIDADES DE FECHAS ---
    function yyyyMmDd(dateObj) {
        const d = new Date(dateObj);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function saveResumen(fechaISO, resumenData) {
        localStorage.setItem(`resumen:${fechaISO}`, JSON.stringify(resumenData));
    }

    function loadResumen(fechaISO) {
        const raw = localStorage.getItem(`resumen:${fechaISO}`);
        return raw ? JSON.parse(raw) : null;
    }

    function saveHoras(fechaISO, horasData) {
        localStorage.setItem(`horas:${fechaISO}`, JSON.stringify(horasData));
    }

    function loadHoras(fechaISO) {
        const raw = localStorage.getItem(`horas:${fechaISO}`);
        return raw ? JSON.parse(raw) : null;
    }

    // --- FUNCIÓN DE COLORES FOSFORITO ---
    function getColorPuesto(puesto) {
        if (state.colorPuestos[puesto]) return state.colorPuestos[puesto];

        const index = state.puestos.indexOf(puesto);
        if (index >= 0 && index < config.coloresFijosPuestos.length) {
            state.colorPuestos[puesto] = config.coloresFijosPuestos[index];
        } else {
            let hash = 0;
            for (let i = 0; i < puesto.length; i++) {
                hash = puesto.charCodeAt(i) + ((hash << 5) - hash);
                hash = hash & hash;
            }
            const paletaIndex = Math.abs(hash) % config.paletaFosforito.length;
            state.colorPuestos[puesto] = config.paletaFosforito[paletaIndex];
        }
        saveColorPuestos();
        return state.colorPuestos[puesto];
    }

    // --- RENDERIZADO DE UI ---
    function renderAll() {
        renderPuestos();
        renderDashboard();
        renderLog();
    }

    function renderPuestos() {
        document.getElementById('puestos-container').innerHTML = state.puestos.map(p => `
            <div class="puesto" style="border-left: 5px solid ${getColorPuesto(p)}">
                <div class="puesto-header"><span>Puesto ${p}</span><button class="quitar-puesto-btn" data-puesto="${p}">X</button></div>
                <div class="tarea-buttons">${config.ordenTareas.map(t => `<button class="add-tarea-btn ${config.abrev[t].replace('+','-')}" data-puesto="${p}" data-tarea="${t}">${config.abrev[t]}</button>`).join('')}</div>
            </div>
        `).join('');
    }

    function renderDashboard() {
        const hoyISO = yyyyMmDd(new Date());
        const logHoy = state.log.filter(l => l.fecha === getHoy());
        const contador = logHoy.reduce((acc, l) => {
            acc[l.puesto] = acc[l.puesto] || { total: 0, ...config.ordenTareas.reduce((a, t) => ({...a, [t]: 0}), {})};
            acc[l.puesto][l.tarea]++;
            acc[l.puesto].total++;
            return acc;
        }, {});

        // Persistir resumen del día
        saveResumen(hoyISO, { fecha: hoyISO, data: contador });

        const puestosOrdenados = Object.keys(contador).sort((a,b) => contador[b].total - contador[a].total);
        if (puestosOrdenados.length === 0) {
            document.getElementById('dashboard-container').innerHTML = '<p>No hay registros para hoy.</p>';
            return;
        }
        let table = '<table class="tabla-resumen"><thead><tr><th>Puesto</th>' + config.ordenTareas.map(t => `<th>${config.abrev[t]}</th>`).join('') + '<th>Total</th></tr></thead><tbody>';
        puestosOrdenados.forEach(p => {
            table += `<tr><td><span style="color:${getColorPuesto(p)}; font-weight:bold;">Puesto ${p}</span></td>` + config.ordenTareas.map(t => `<td>${contador[p][t]}</td>`).join('') + `<td>${contador[p].total}</td></tr>`;
        });
        document.getElementById('dashboard-container').innerHTML = table + '</tbody></table>';
    }

    function renderLog() {
        document.getElementById('log-container').innerHTML = state.log.filter(l => l.fecha === getHoy()).slice(0, 50).map(l => `
            <div class="log-entry">
                <span><strong style="color:${getColorPuesto(l.puesto)};">Puesto ${l.puesto}</strong> | ${l.hora} | ${config.abrev[l.tarea]}</span>
                <button class="eliminar-log-btn" data-id="${l.id}">X</button>
            </div>
        `).join('');
    }

    function renderHistorialCompleto() {
        const cont = document.getElementById('hist-completo');
        const logAgrupado = state.log.reduce((acc, l) => {
            if (!acc[l.fecha]) acc[l.fecha] = [];
            acc[l.fecha].push(l);
            return acc;
        }, {});
        const fechas = Object.keys(logAgrupado).sort((a,b) => new Date(b) - new Date(a));
        if (fechas.length === 0) {
            cont.innerHTML = '<p>No hay historial de registros.</p>';
            return;
        }
        cont.innerHTML = fechas.map(f => {
            const fechaFormateada = new Date(f).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            return `<div class="puesto"><h4>${fechaFormateada}</h4>` + logAgrupado[f].map(l => `<div><strong style="color:${getColorPuesto(l.puesto)};">Puesto ${l.puesto}</strong> - ${l.hora} - ${config.abrev[l.tarea]}</div>`).join('') + `</div>`;
        }).join('');
    }

    function renderHistorialCompact() {
        const cont = document.getElementById('hist-compact');
        const fechasSet = new Set(state.log.map(l => yyyyMmDd(new Date(l.fecha))));
        const fechas = Array.from(fechasSet).sort((a,b) => new Date(b) - new Date(a));
        
        if (fechas.length === 0) {
            cont.innerHTML = '<p>No hay datos para mostrar.</p>';
            return;
        }

        cont.innerHTML = fechas.map(fechaISO => {
            let resumen = loadResumen(fechaISO);
            if (!resumen) {
                const fechaStr = new Date(fechaISO).toDateString();
                const delDia = state.log.filter(l => l.fecha === fechaStr);
                const contador = delDia.reduce((acc, l) => {
                    acc[l.puesto] = acc[l.puesto] || { total: 0, ...config.ordenTareas.reduce((a, t) => ({...a, [t]: 0}), {})};
                    acc[l.puesto][l.tarea]++;
                    acc[l.puesto].total++;
                    return acc;
                }, {});
                resumen = { fecha: fechaISO, data: contador };
                saveResumen(fechaISO, resumen);
            }
            
            const titulo = new Date(fechaISO).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            const puestosOrdenados = Object.keys(resumen.data).sort((a,b) => resumen.data[b].total - resumen.data[a].total);
            
            let table = '<table class="tabla-resumen"><thead><tr><th>Puesto</th>' + config.ordenTareas.map(t => `<th>${config.abrev[t]}</th>`).join('') + '<th>Total</th></tr></thead><tbody>';
            puestosOrdenados.forEach(p => {
                table += `<tr><td><span style="color:${getColorPuesto(p)}; font-weight:bold;">Puesto ${p}</span></td>`;
                config.ordenTareas.forEach(t => table += `<td>${resumen.data[p][t] || 0}</td>`);
                table += `<td>${resumen.data[p].total || 0}</td></tr>`;
            });
            table += '</tbody></table>';
            
            return `<div class="puesto"><h4>${titulo}</h4>${table}</div>`;
        }).join('');
    }

    function fechasDeRango(rango) {
        const hoy = new Date();
        const start = new Date(hoy);
        const end = new Date(hoy);
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        
        if (rango === 'ayer') {
            start.setDate(hoy.getDate() - 1);
            end.setDate(hoy.getDate() - 1);
        } else if (rango === '7dias') {
            start.setDate(hoy.getDate() - 6);
        } else if (rango === 'mes') {
            start.setDate(1);
        }
        
        return { start, end };
    }

    function renderDistribucionHoras(rango = 'hoy') {
        const cont = document.getElementById('horas-container');
        const { start, end } = fechasDeRango(rango);

        const fechasSet = new Set();
        state.log.forEach(l => {
            const d = new Date(l.fecha);
            if (d >= start && d <= end) fechasSet.add(yyyyMmDd(d));
        });
        
        const fechas = Array.from(fechasSet).sort((a,b) => new Date(a) - new Date(b));
        
        if (fechas.length === 0) {
            cont.innerHTML = '<p>No hay datos en el rango seleccionado.</p>';
            return;
        }

        let html = '';
        fechas.forEach(fechaISO => {
            let horasData = loadHoras(fechaISO);
            
            if (!horasData) {
                const fechaStr = new Date(fechaISO).toDateString();
                const delDia = state.log.filter(l => l.fecha === fechaStr);
                const esfuerzo = delDia.reduce((acc, l) => {
                    acc[l.puesto] = (acc[l.puesto] || 0) + (config.tiempos[l.tarea] || 0);
                    return acc;
                }, {});
                
                const total = Object.values(esfuerzo).reduce((s, v) => s + v, 0) || 1;
                const asignacion = {};
                
                Object.keys(esfuerzo).forEach(p => {
                    const minutos = (esfuerzo[p] / total) * config.JORNADA_MINUTOS;
                    asignacion[p] = { minutos, horasDecimal: minutos / 60 };
                });
                
                horasData = { fecha: fechaISO, asignacion };
                saveHoras(fechaISO, horasData);
            }

            const titulo = new Date(fechaISO).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            let tabla = '<table class="tabla-resumen"><thead><tr><th>Puesto</th><th>Tiempo Asignado</th><th>Decimal</th></tr></thead><tbody>';
            
            Object.keys(horasData.asignacion).sort((a,b) => horasData.asignacion[b].minutos - horasData.asignacion[a].minutos).forEach(p => {
                const mins = horasData.asignacion[p].minutos;
                tabla += `<tr><td><strong style="color:${getColorPuesto(p)};">Puesto ${p}</strong></td><td>${Math.floor(mins / 60)}h ${Math.round(mins % 60)}min</td><td>${horasData.asignacion[p].horasDecimal.toFixed(2)}</td></tr>`;
            });
            
            tabla += '</tbody></table>';
            html += `<div class="puesto"><h4>${titulo}</h4>${tabla}</div>`;
        });

        cont.innerHTML = html;
    }

    function renderGraficas(periodo) {
        if (state.chartInstance) state.chartInstance.destroy();
        
        let fechaInicio = new Date();
        fechaInicio.setHours(0,0,0,0);
        
        switch(periodo) {
            case 'weekly': fechaInicio.setDate(fechaInicio.getDate() - 6); break;
            case 'biweekly': fechaInicio.setDate(fechaInicio.getDate() - 14); break;
            case 'monthly': fechaInicio.setDate(fechaInicio.getDate() - 29); break;
        }

        const logFiltrado = (periodo === 'daily') ? state.log.filter(l => l.fecha === getHoy()) : state.log.filter(l => new Date(l.fecha) >= fechaInicio);

        const contador = logFiltrado.reduce((acc, l) => {
            acc[l.puesto] = acc[l.puesto] || { ...config.ordenTareas.reduce((a, t) => ({...a, [t]: 0}), {}), total: 0 };
            acc[l.puesto][l.tarea]++;
            acc[l.puesto].total++;
            return acc;
        }, {});

        const puestosOrdenados = Object.keys(contador).sort((a,b) => contador[b].total - contador[a].total);

        const datasets = config.ordenTareas.map(t => ({
            label: config.abrev[t],
            data: puestosOrdenados.map(p => contador[p][t]),
            backgroundColor: config.coloresTareas[t]
        }));

        const ctx = document.getElementById('grafico-puestos').getContext('2d');
        state.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels: puestosOrdenados.map(p => `Puesto ${p}`), datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
            }
        });
    }
    
    // --- LÓGICA DE ACCIONES Y EVENTOS ---
    function setupListeners() {
        document.getElementById('theme-toggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙';
            localStorage.setItem('theme', isDark ? 'dark-mode' : '');
        });

        document.querySelector('.modo-toggle').addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') {
                const vista = e.target.dataset.vista;
                document.querySelectorAll('.vista-container, .modo-toggle button').forEach(el => el.classList.remove('active'));
                document.getElementById(`vista-${vista}`).classList.add('active');
                e.target.classList.add('active');
                
                if (vista === 'historial') {
                    renderHistorialCompleto();
                }
                if (vista === 'horas') {
                    renderDistribucionHoras('hoy');
                }
                if (vista === 'graficas') {
                    renderGraficas('daily');
                }
            }
        });

        document.querySelector('.hist-tabs').addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') {
                document.querySelectorAll('.hist-tabs button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const sub = e.target.dataset.sub;
                document.getElementById('hist-completo').style.display = (sub === 'completo') ? 'block' : 'none';
                document.getElementById('hist-compact').style.display = (sub === 'compact') ? 'block' : 'none';
                
                if (sub === 'completo') renderHistorialCompleto();
                if (sub === 'compact') renderHistorialCompact();
            }
        });

        document.querySelector('.horas-filtros').addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') {
                document.querySelectorAll('.horas-filtros button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                renderDistribucionHoras(e.target.dataset.rango);
            }
        });

        document.querySelector('.filtros-graficas').addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') {
                document.querySelectorAll('.filtros-graficas button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                renderGraficas(e.target.dataset.periodo);
            }
        });

        document.getElementById('add-puesto-btn').addEventListener('click', () => {
            const input = document.getElementById('nuevo-puesto-input');
            const num = input.value.trim();
            if (num && !state.puestos.includes(num)) {
                state.puestos.push(num);
                state.puestos.sort((a, b) => parseInt(a) - parseInt(b));
                savePuestos();
                renderPuestos();
            }
            input.value = '';
        });

        document.getElementById('nuevo-puesto-input').addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                document.getElementById('add-puesto-btn').click();
            }
        });

        document.getElementById('clear-today-btn').addEventListener('click', () => {
            if (confirm('¿Seguro que quieres borrar todos los registros de hoy?')) {
                state.log = state.log.filter(l => l.fecha !== getHoy());
                saveLog();
                renderAll();
            }
        });

        document.body.addEventListener('click', e => {
            const target = e.target;
            if (target.classList.contains('add-tarea-btn')) {
                const { puesto, tarea } = target.dataset;
                const now = new Date();
                state.log.unshift({ id: Date.now(), puesto, tarea, fecha: now.toDateString(), hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) });
                saveLog();
                renderAll();
            }
            if (target.classList.contains('quitar-puesto-btn')) {
                if (confirm(`¿Seguro que quieres quitar el puesto ${target.dataset.puesto}?`)) {
                    state.puestos = state.puestos.filter(p => p !== target.dataset.puesto);
                    savePuestos();
                    renderPuestos();
                }
            }
            if (target.classList.contains('eliminar-log-btn')) {
                state.log = state.log.filter(l => l.id !== parseInt(target.dataset.id));
                saveLog();
                renderAll();
            }
        });
    }

    // --- INICIALIZACIÓN ---
    function init() {
        if (localStorage.getItem('theme') === 'dark-mode') {
            document.body.classList.add('dark-mode');
            document.getElementById('theme-toggle').textContent = '☀️';
        }
        setupListeners();
        renderAll();
    }

    init();
});

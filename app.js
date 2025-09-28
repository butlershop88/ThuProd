// Registrar Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => console.log('SW ok')).catch(err => console.log('SW err', err));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const ordenTareas = ["Flejar+Paquete", "Paquete", "Bobina", "Cuna"];
    const tareasAbrev = {"Flejar+Paquete": "F+P", "Paquete": "P", "Bobina": "B", "Cuna": "C"};
    const tiemposPorTarea = {"Flejar+Paquete": 6, "Paquete": 3, "Bobina": 8, "Cuna": 5};
    const coloresPuestos = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#8e44ad', '#16a085', '#27ae60'];
    const coloresTareas = { "Flejar+Paquete": 'rgba(40, 167, 69, 0.7)', "Paquete": 'rgba(0, 123, 255, 0.7)', "Bobina": 'rgba(255, 193, 7, 0.7)', "Cuna": 'rgba(220, 53, 69, 0.7)' };

    let puestos = JSON.parse(localStorage.getItem('puestos') || "[]");
    let log = JSON.parse(localStorage.getItem('registroTareas') || "[]");
    let modoActual = 'actual';
    const JORNADA_TOTAL_MINUTOS = 7 * 60 + 45;
    let graficoPuestosChart;

    // ... (funciones save, getFechaHoy, getColorPuesto sin cambios)
    function savePuestos() { localStorage.setItem('puestos', JSON.stringify(puestos)); }
    function saveLog() { localStorage.setItem('registroTareas', JSON.stringify(log)); }
    function getFechaHoy() { return new Date().toDateString(); }
    function getColorPuesto(puesto) { /* ...código sin cambios... */ }

    function cambiarModo(modo) {
        modoActual = modo;
        document.querySelectorAll('.modo-toggle button').forEach(btn => btn.classList.remove('modo-activo'));
        document.getElementById(`btn-modo-${modo}`).classList.add('modo-activo');
        document.querySelectorAll('.vista-container').forEach(vista => vista.style.display = 'none');
        document.getElementById(`vista-${modo}`).style.display = 'block';

        if (modo === 'historial') renderHistorial();
        if (modo === 'horas') renderDistribucionHoras();
        if (modo === 'graficas') renderGraficas('daily'); // Carga la vista diaria por defecto
    }
    
    // --- NUEVA LÓGICA PARA GRÁFICOS ---

    function filterLogByPeriod(periodo) {
        const hoy = new Date();
        const fin = new Date(hoy);
        fin.setHours(23, 59, 59, 999);
        let inicio = new Date(hoy);
        inicio.setHours(0, 0, 0, 0);

        switch (periodo) {
            case 'weekly':
                inicio.setDate(hoy.getDate() - 6);
                break;
            case 'biweekly':
                inicio.setDate(hoy.getDate() - 14);
                break;
            case 'monthly':
                inicio.setDate(hoy.getDate() - 29);
                break;
        }
        
        return log.filter(r => {
            const fechaRegistro = new Date(r.fecha);
            return fechaRegistro >= inicio && fechaRegistro <= fin;
        });
    }

    function renderGraficas(periodo) {
        // Marcar botón de filtro activo
        document.querySelectorAll('#graficas-filtros button').forEach(btn => {
            btn.classList.toggle('activo', btn.dataset.periodo === periodo);
        });

        const datosFiltrados = filterLogByPeriod(periodo);
        const datosPorPuesto = datosFiltrados.reduce((acc, r) => {
            if (!acc[r.puesto]) {
                acc[r.puesto] = { total: 0 };
                ordenTareas.forEach(t => acc[r.puesto][t] = 0);
            }
            acc[r.puesto][r.tarea]++;
            acc[r.puesto].total++;
            return acc;
        }, {});
        
        // Ordenar puestos de más a menos tareas
        const puestosOrdenados = Object.keys(datosPorPuesto).sort((a, b) => datosPorPuesto[b].total - datosPorPuesto[a].total);

        const labels = puestosOrdenados.map(p => `Puesto ${p}`);
        const datasets = ordenTareas.map(tarea => ({
            label: tareasAbrev[tarea],
            data: puestosOrdenados.map(p => datosPorPuesto[p][tarea]),
            backgroundColor: coloresTareas[tarea],
        }));

        const ctx = document.getElementById('graficoPuestos').getContext('2d');
        if (graficoPuestosChart) {
            graficoPuestosChart.destroy();
        }
        
        graficoPuestosChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: `Resumen de Tareas (${periodo})`, color: 'var(--text-color)' },
                    legend: { labels: { color: 'var(--text-color)' } }
                },
                scales: {
                    x: { stacked: true, ticks: { color: 'var(--text-color)' } },
                    y: { stacked: true, beginAtZero: true, ticks: { color: 'var(--text-color)', stepSize: 1 } }
                }
            }
        });
    }
    
    // ... (resto de funciones: addPuesto, quitarPuesto, addRegistro, etc. sin cambios)
    function addPuesto() { /* ...código sin cambios... */ }
    function quitarPuesto(puestoAQuitar) { /* ...código sin cambios... */ }
    function addRegistro(puesto, tarea) { /* ...código sin cambios... */ }
    function eliminarRegistro(id) { /* ...código sin cambios... */ }
    function limpiarTodosLosRegistros() { /* ...código sin cambios... */ }
    function calcularDistribucionHoras() { /* ...código sin cambios... */ }
    function renderDistribucionHoras() { /* ...código sin cambios... */ }
    function renderDashboard() { /* ...código sin cambios... */ }
    function renderPuestos() { /* ...código sin cambios... */ }
    function renderLog() { /* ...código sin cambios... */ }
    function renderHistorial() { /* ...código sin cambios... */ }

    // --- EVENT LISTENERS ---
    window.addRegistroGlobal = addRegistro; window.quitarPuestoGlobal = quitarPuesto; window.eliminarRegistroGlobal = eliminarRegistro;
    
    const themeToggle = document.getElementById('theme-toggle');
    // ... (código del theme toggle sin cambios)

    // Actualizar listeners de modos
    ['actual', 'historial', 'horas', 'graficas'].forEach(m => document.getElementById(`btn-modo-${m}`).addEventListener('click', () => cambiarModo(m)));
    
    // Listeners para filtros de gráficos
    document.querySelectorAll('#graficas-filtros button').forEach(btn => {
        btn.addEventListener('click', () => renderGraficas(btn.dataset.periodo));
    });

    document.getElementById('addPuestoBtn').addEventListener('click', addPuesto);
    document.getElementById('limpiarRegistrosBtn').addEventListener('click', limpiarTodosLosRegistros);
    document.getElementById('nuevoPuesto').addEventListener('keypress', e => { if (e.key === 'Enter') addPuesto(); });

    // Inicialización
    renderPuestos(); renderLog(); renderDashboard();
});

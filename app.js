document.addEventListener('DOMContentLoaded', () => {
  // CONFIGURACION Y CONSTANTES
  const config = {
    ordenTareas: ['Flejar+Paquete', 'Paquete', 'Bobina', 'Cuna'],
    abrev: { 'Flejar+Paquete': 'F-P', Paquete: 'P', Bobina: 'B', Cuna: 'C' },
    tiempos: { 'Flejar+Paquete': 6, Paquete: 3, Bobina: 8, Cuna: 5 },
    coloresTareas: {
      'Flejar+Paquete': 'rgba(25, 135, 84, 0.8)', // verde para F+P
      'Paquete': 'rgba(255, 165, 0, 0.8)', // naranja para P
      'Bobina': 'rgba(128, 128, 128, 0.8)', // gris para B
      'Cuna': 'rgba(165, 42, 42, 0.8)', // marrón para C
    },
    coloresFijosPuestos: {
      '23': '#FF4D4D',      // rojo
      '24': '#4DB3FF',      // azul
      '11': '#FFF04D',      // amarillo
      '15': '#6CFF6C',      // verde
    },
    paletaSecundaria: [
      '#FFA500',   // naranja
      '#FF69B4',   // rosa
      '#FFFFFF',   // blanco (modo noche) / negro (modo día)
      '#9370DB',   // lila
      '#87CEEB',   // azul celeste
      '#7FFFD4',   // verde celeste (aquamarine)
      '#FFB366',   // naranja celeste
    ],
    JORNADA_MINUTOS: 465,
  };

  // Estado general
  let state = {
    puestos: JSON.parse(localStorage.getItem('puestos') || '[]'),
    log: JSON.parse(localStorage.getItem('registroTareas') || '[]'),
    colorPuestos: JSON.parse(localStorage.getItem('colorPuestos') || '{}'),
    chartInstance: null,
    jornadaActual: localStorage.getItem('jornadaActual') || new Date().toISOString().split('T')[0],
  };

  // Funciones de guardado
  const savePuestos = () => localStorage.setItem('puestos', JSON.stringify(state.puestos));
  const saveLog = () => localStorage.setItem('registroTareas', JSON.stringify(state.log));
  const saveColorPuestos = () => localStorage.setItem('colorPuestos', JSON.stringify(state.colorPuestos));
  const saveJornada = () => localStorage.setItem('jornadaActual', state.jornadaActual);
  const getHoy = () => state.jornadaActual;

  // Funciones auxiliares para fechas
  function yyyyMmDd(dateObj) {
    const d = new Date(dateObj);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  // Función para obtener colores para puestos
  function getColorPuesto(puesto) {
    if (state.colorPuestos[puesto]) return state.colorPuestos[puesto];
    
    // Colores fijos para puestos específicos
    if (config.coloresFijosPuestos[puesto]) {
      state.colorPuestos[puesto] = config.coloresFijosPuestos[puesto];
      saveColorPuestos();
      return state.colorPuestos[puesto];
    }
    
    // Para otros puestos, usar paleta secundaria cíclicamente
    const puestosNoFijos = state.puestos.filter(p => !config.coloresFijosPuestos[p]);
    const index = puestosNoFijos.indexOf(puesto);
    
    if (index >= 0) {
      let color = config.paletaSecundaria[index % config.paletaSecundaria.length];
      
      // Ajustar blanco/negro según modo oscuro
      if (color === '#FFFFFF' && !document.body.classList.contains('dark-mode')) {
        color = '#000000';
      }
      
      state.colorPuestos[puesto] = color;
      saveColorPuestos();
      return color;
    }
    
    // Fallback
    state.colorPuestos[puesto] = '#CCCCCC';
    saveColorPuestos();
    return state.colorPuestos[puesto];
  }
  
  // Renderizado de TODA la UI principal
  function renderAll() {
    renderPuestos();
    renderDashboard();
    renderLog();
  }

  // Renderizado de puestos
  function renderPuestos() {
    const container = document.getElementById('puestos-container');
    container.innerHTML = state.puestos
      .map(
        (p) => `
      <div class="puesto" style="border-left: 5px solid ${getColorPuesto(p)}">
        <div class="puesto-header">
          <span>Puesto ${p}</span>
          <button class="quitar-puesto-btn" data-puesto="${p}" aria-label="Quitar puesto ${p}">X</button>
        </div>
        <div class="tarea-buttons">${config.ordenTareas
          .map(
            (t) => `<button class="add-tarea-btn ${config.abrev[t]}" data-puesto="${p}" data-tarea="${t}" aria-label="Añadir tarea ${config.abrev[t]} al puesto ${p}">${config.abrev[t]}</button>`
          )
          .join('')}</div>
      </div>`
      )
      .join('');
  }

  // Renderizar resumen diario
  function renderDashboard() {
    const hoyISO = yyyyMmDd(new Date(state.jornadaActual));
    const logHoy = state.log.filter((l) => l.fecha === state.jornadaActual);
    const contador = logHoy.reduce((acc, l) => {
      acc[l.puesto] = acc[l.puesto] || { total: 0, ...config.ordenTareas.reduce((a, t) => ({ ...a, [t]: 0 }), {}) };
      acc[l.puesto][l.tarea]++;
      acc[l.puesto].total++;
      return acc;
    }, {});
    saveResumen(hoyISO, { fecha: hoyISO, data: contador });

    const puestosOrdenados = Object.keys(contador).sort((a, b) => contador[b].total - contador[a].total);
    if (puestosOrdenados.length === 0) {
      document.getElementById('dashboard-container').innerHTML = '<p>No hay registros para hoy.</p>';
      return;
    }
    let table =
      '<table class="tabla-resumen"><thead><tr><th>Puesto</th>' +
      config.ordenTareas.map((t) => `<th>${config.abrev[t]}</th>`).join('') +
      '<th>Total</th></tr></thead><tbody>';
    puestosOrdenados.forEach((p) => {
      table +=
        `<tr><td><span style="color:${getColorPuesto(p)}; font-weight:bold;">Puesto ${p}</span></td>` +
        config.ordenTareas.map((t) => `<td>${contador[p][t] || 0}</td>`).join('') +
        `<td>${contador[p].total}</td></tr>`;
    });
    document.getElementById('dashboard-container').innerHTML = table + '</tbody></table>';
  }

  // Renderizar log
  function renderLog() {
    document.getElementById('log-container').innerHTML = state.log
      .filter((l) => l.fecha === state.jornadaActual)
      .slice(0, 50)
      .map(
        (l) => `
      <div class="log-entry">
        <span><strong style="color:${getColorPuesto(l.puesto)};">Puesto ${l.puesto}</strong> | ${l.hora} | ${config.abrev[l.tarea]}</span>
        <button class="eliminar-log-btn" data-id="${l.id}" aria-label="Eliminar registro"></button>
      </div>`
      )
      .join('');
  }

  // Render Historial Completo
  function renderHistorialCompleto() {
    const cont = document.getElementById('hist-completo');
    const logAgrupado = state.log.reduce((acc, l) => {
      if (!acc[l.fecha]) acc[l.fecha] = [];
      acc[l.fecha].push(l);
      return acc;
    }, {});
    const fechas = Object.keys(logAgrupado).sort((a, b) => new Date(b) - new Date(a));
    if (fechas.length === 0) {
      cont.innerHTML = '<p>No hay historial de registros.</p>';
      return;
    }
    cont.innerHTML = fechas
      .map((f) => {
        const fechaFormateada = new Date(f).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        return (
          '<div class="puesto"><h4>' +
          fechaFormateada +
          '</h4>' +
          logAgrupado[f]
            .map((l) => `<div><strong style="color:${getColorPuesto(l.puesto)};">Puesto ${l.puesto}</strong> - ${l.hora} - ${config.abrev[l.tarea]}</div>`)
            .join('') +
          '</div>'
        );
      })
      .join('');
  }

  // Render Historial Compacto
  function renderHistorialCompact() {
    const cont = document.getElementById('hist-compact');
    const fechasSet = new Set(state.log.map((l) => yyyyMmDd(new Date(l.fecha))));
    const fechas = Array.from(fechasSet).sort((a, b) => new Date(b) - new Date(a));
    if (fechas.length === 0) {
      cont.innerHTML = '<p>No hay datos para mostrar.</p>';
      return;
    }
    cont.innerHTML = fechas
      .map((fechaISO) => {
        let resumen = loadResumen(fechaISO);
        if (!resumen) {
          const fechaStr = new Date(fechaISO).toDateString();
          const delDia = state.log.filter((l) => l.fecha === fechaStr);
          const contador = delDia.reduce((acc, l) => {
            acc[l.puesto] = acc[l.puesto] || { total: 0, ...config.ordenTareas.reduce((a, t) => ({ ...a, [t]: 0 }), {}) };
            acc[l.puesto][l.tarea]++;
            acc[l.puesto].total++;
            return acc;
          }, {});
          resumen = { fecha: fechaISO, data: contador };
          saveResumen(fechaISO, resumen);
        }
        const titulo = new Date(fechaISO).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        const puestosOrdenados = Object.keys(resumen.data).sort((a, b) => resumen.data[b].total - resumen.data[a].total);
        let table =
          '<table class="tabla-resumen"><thead><tr><th>Puesto</th>' +
          config.ordenTareas.map((t) => `<th>${config.abrev[t]}</th>`).join('') +
          '<th>Total</th></tr></thead><tbody>';
        puestosOrdenados.forEach((p) => {
          table += `<tr><td><span style="color:${getColorPuesto(p)}; font-weight:bold;">Puesto ${p}</span></td>`;
          config.ordenTareas.forEach((t) => (table += `<td>${resumen.data[p][t] || 0}</td>`));
          table += `<td>${resumen.data[p].total || 0}</td></tr>`;
        });
        table += '</tbody></table>';
        return `<div class="puesto"><h4>${titulo}</h4>${table}</div>`;
      })
      .join('');
  }

  // Calculo fechas para filtros Horas
  function fechasDeRango(rango) {
    const hoy = new Date();
    const start = new Date(hoy);
    const end = new Date(hoy);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
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

  // Render Horas con persistencia y filtro por rango
  function renderDistribucionHoras(rango = 'hoy') {
    const cont = document.getElementById('horas-container');

    // Forzar el rango a 'hoy' para esta pestaña
    const { start, end } = fechasDeRango('hoy');

    const logHoy = state.log.filter(l => {
        const d = new Date(l.fecha);
        return d >= start && d <= end;
    });

    if (logHoy.length === 0) {
        cont.innerHTML = '<p>No hay datos para hoy.</p>';
        return;
    }

    const esfuerzo = logHoy.reduce((acc, l) => {
        acc[l.puesto] = (acc[l.puesto] || 0) + (config.tiempos[l.tarea] || 0);
        return acc;
    }, {});

    const totalEsfuerzo = Object.values(esfuerzo).reduce((s, v) => s + v, 0);

    if (totalEsfuerzo === 0) {
        cont.innerHTML = '<p>No hay tareas con tiempo asignado para hoy.</p>';
        return;
    }

    const asignacion = {};
    Object.keys(esfuerzo).forEach(p => {
        const minutos = (esfuerzo[p] / totalEsfuerzo) * config.JORNADA_MINUTOS;
        asignacion[p] = { minutos, horasDecimal: minutos / 60 };
    });

    const hoyISO = yyyyMmDd(new Date());
    const horasData = { fecha: hoyISO, asignacion };
    saveHoras(hoyISO, horasData);

    let tabla = '<table class="tabla-resumen"><thead><tr><th>Puesto</th><th>Tiempo Asignado</th><th>Decimal</th></tr></thead><tbody>';
    Object.keys(asignacion)
        .sort((a, b) => asignacion[b].minutos - asignacion[a].minutos)
        .forEach(p => {
            const { minutos, horasDecimal } = asignacion[p];
            tabla += `<tr><td><strong style="color:${getColorPuesto(p)};">P${p}</strong></td><td>${Math.floor(minutos / 60)}h ${Math.round(minutos % 60)}min</td><td>${horasDecimal.toFixed(2)}</td></tr>`;
        });
    tabla += '</tbody></table>';

    cont.innerHTML = `<div class="puesto"><h4>Distribución para Hoy</h4>${tabla}</div>`;
}

  // Render Grafico
  function renderGraficas(periodo) {
    if (state.chartInstance) state.chartInstance.destroy();

    let fechaInicio = new Date();
    fechaInicio.setHours(0, 0, 0, 0);

    switch (periodo) {
      case 'weekly':
        fechaInicio.setDate(fechaInicio.getDate() - 6);
        break;
      case 'biweekly':
        fechaInicio.setDate(fechaInicio.getDate() - 14);
        break;
      case 'monthly':
        fechaInicio.setDate(fechaInicio.getDate() - 29);
        break;
    }

    const logFiltrado =
      periodo === 'daily' ? state.log.filter((l) => l.fecha === getHoy()) : state.log.filter((l) => new Date(l.fecha) >= fechaInicio);

    const contador = logFiltrado.reduce((acc, l) => {
      acc[l.puesto] = acc[l.puesto] || { ...config.ordenTareas.reduce((a, t) => ({ ...a, [t]: 0 }), {}), total: 0 };
      acc[l.puesto][l.tarea]++;
      acc[l.puesto].total++;
      return acc;
    }, {});

    const puestosOrdenados = Object.keys(contador).sort((a, b) => contador[b].total - contador[a].total);

    const datasets = config.ordenTareas.map((t) => ({
      label: config.abrev[t],
      data: puestosOrdenados.map((p) => contador[p][t]),
      backgroundColor: config.coloresTareas[t],
    }));

    const ctx = document.getElementById('grafico-puestos').getContext('2d');
    state.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: { labels: puestosOrdenados.map((p) => `Puesto ${p}`), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
      },
    });
  }

  // EVENTOS
  function setupListeners() {
    document.getElementById('theme-toggle').addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙';
      localStorage.setItem('theme', isDark ? 'dark-mode' : '');
      if (document.getElementById('vista-graficas').classList.contains('active'))
        renderGraficas(document.querySelector('.filtros-graficas button.active').dataset.periodo);
    });

    document.querySelector('.modo-toggle').addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        const vista = e.target.dataset.vista;
        document.querySelectorAll('.vista-container, .modo-toggle button').forEach((el) => el.classList.remove('active'));
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

    document.querySelector('.hist-tabs').addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        document.querySelectorAll('.hist-tabs button').forEach((b) => b.classList.remove('active'));
        e.target.classList.add('active');
        const sub = e.target.dataset.sub;
        document.getElementById('hist-completo').style.display = sub === 'completo' ? 'block' : 'none';
        document.getElementById('hist-compact').style.display = sub === 'compact' ? 'block' : 'none';

        if (sub === 'completo') renderHistorialCompleto();
        if (sub === 'compact') renderHistorialCompact();
      }
    });

    document.querySelector('.horas-filtros').addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        document.querySelectorAll('.horas-filtros button').forEach((b) => b.classList.remove('active'));
        e.target.classList.add('active');
        renderDistribucionHoras(e.target.dataset.rango);
      }
    });

    document.querySelector('.filtros-graficas').addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        document.querySelectorAll('.filtros-graficas button').forEach((b) => b.classList.remove('active'));
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
        renderAll(); // <-- LLAMADA A renderAll
      }
      input.value = '';
    });

    document.getElementById('nuevo-puesto-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('add-puesto-btn').click();
      }
    });

    document.getElementById('clear-today-btn').addEventListener('click', () => {
      if (confirm('¿Seguro que quieres borrar todos los registros de la jornada actual (sin guardar)?')) {
        state.log = state.log.filter((l) => l.fecha !== state.jornadaActual);
        saveLog();
        renderAll();
      }
    });

    document.getElementById('finalizar-jornada-btn').addEventListener('click', () => {
      if (confirm('¿Finalizar jornada actual y empezar una nueva?')) {
        // Guardar resumen del día actual
        const hoyISO = yyyyMmDd(new Date(state.jornadaActual));
        const logHoy = state.log.filter((l) => l.fecha === state.jornadaActual);
        
        if (logHoy.length === 0) {
          alert('No hay registros en la jornada actual.');
          return;
        }
        
        const contador = logHoy.reduce((acc, l) => {
          acc[l.puesto] = acc[l.puesto] || { total: 0, ...config.ordenTareas.reduce((a, t) => ({ ...a, [t]: 0 }), {}) };
          acc[l.puesto][l.tarea]++;
          acc[l.puesto].total++;
          return acc;
        }, {});
        saveResumen(hoyISO, { fecha: hoyISO, data: contador });
        
        // Calcular y guardar horas
        const esfuerzo = logHoy.reduce((acc, l) => {
          acc[l.puesto] = (acc[l.puesto] || 0) + (config.tiempos[l.tarea] || 0);
          return acc;
        }, {});
        const totalEsfuerzo = Object.values(esfuerzo).reduce((s, v) => s + v, 0);
        if (totalEsfuerzo > 0) {
          const asignacion = {};
          Object.keys(esfuerzo).forEach(p => {
            const minutos = (esfuerzo[p] / totalEsfuerzo) * config.JORNADA_MINUTOS;
            asignacion[p] = { minutos, horasDecimal: minutos / 60 };
          });
          saveHoras(hoyISO, { fecha: hoyISO, asignacion });
        }
        
        // Iniciar nueva jornada (fecha actual real)
        const nuevaFecha = new Date().toISOString().split('T')[0];
        state.jornadaActual = nuevaFecha;
        saveJornada();
        
        // NO eliminamos el log histórico, solo actualizamos la vista
        renderAll();
        alert(`Jornada ${hoyISO} finalizada. Nueva jornada ${nuevaFecha} iniciada.`);
      }
    });

    document.getElementById('reset-colors-btn').addEventListener('click', () => {
      if (confirm('¿Resetear todos los colores de puestos?')) {
        state.colorPuestos = {};
        saveColorPuestos();
        renderAll();
      }
    });

    document.body.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('add-tarea-btn')) {
        const { puesto, tarea } = target.dataset;
        const now = new Date();
        state.log.unshift({ id: Date.now(), puesto, tarea, fecha: state.jornadaActual, hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) });
        saveLog();
        renderAll(); // <-- LLAMADA A renderAll
      }
      if (target.classList.contains('quitar-puesto-btn')) {
        if (confirm(`¿Seguro que quieres quitar el puesto ${target.dataset.puesto}?`)) {
          state.puestos = state.puestos.filter((p) => p !== target.dataset.puesto);
          savePuestos();
          renderAll(); // <-- LLAMADA A renderAll
        }
      }
      if (target.classList.contains('eliminar-log-btn')) {
        state.log = state.log.filter((l) => l.id !== parseInt(target.dataset.id));
        saveLog();
        renderAll();
      }
    });
  }

  // INICIALIZACION
  function init() {

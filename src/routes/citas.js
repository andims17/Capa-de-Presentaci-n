const express = require('express');
const router = express.Router();
const citasModel = require('../models/citasModel');
const clientesModel = require('../models/clientesModel');

// ── Gestión de Citas (lista) ────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const fecha = req.query.fecha || null;
        const clienteId = req.query.clienteId ? Number(req.query.clienteId) : null;
        const errorMsg = req.query.error || null;

        const citas = await citasModel.listarCitas(fecha, clienteId);
        const clientes = await clientesModel.listarClientes() || [];

        res.render('citas/index', {
            title: 'Gestión de Citas',
            citas,
            clientes,
            fecha: fecha || '',
            clienteId: clienteId || '',
            error: errorMsg
        });
    } catch (error) {
        console.error('Error listando citas:', error);
        res.render('citas/index', {
            title: 'Gestión de Citas',
            citas: [],
            clientes: [],
            fecha: '',
            clienteId: '',
            error: 'No se pudieron cargar las citas.'
        });
    }
});

// ── Calendario de Citas ─────────────────────────────────────────────────────
router.get('/calendario', async (req, res) => {
    try {
        // Determinar mes/año a mostrar
        const hoy = new Date();
        let year  = parseInt(req.query.year)  || hoy.getFullYear();
        let month = parseInt(req.query.month) || (hoy.getMonth() + 1); // 1-12

        // Sanitizar valores
        if (month < 1)  { month = 12; year--; }
        if (month > 12) { month = 1;  year++; }

        // Rango del mes: primer y último día
        const primerDia = new Date(year, month - 1, 1);
        const ultimoDia = new Date(year, month, 0);

        // Formatear fechas para el SP (YYYY-MM-DD)
        const pad = n => String(n).padStart(2, '0');
        const fechaInicio = `${year}-${pad(month)}-01`;
        const fechaFin    = `${year}-${pad(month)}-${pad(ultimoDia.getDate())}`;

        // Traer todas las citas del mes usando el rango completo
        const citasMes = await citasModel.listarCitasPorRango(fechaInicio, fechaFin);

        // Construir celdas del calendario
        // El primer día de la semana del mes (0=Dom ... 6=Sáb)
        const diaInicio = primerDia.getDay();
        const diasEnMes = ultimoDia.getDate();

        // Agrupar citas por FechaISO
        const citasPorDia = {};
        citasMes.forEach(c => {
            if (!citasPorDia[c.FechaISO]) citasPorDia[c.FechaISO] = [];
            citasPorDia[c.FechaISO].push(c);
        });
        // Ordenar citas de cada día por hora
        Object.values(citasPorDia).forEach(arr => {
            arr.sort((a, b) => (a.Hora || '').localeCompare(b.Hora || ''));
        });

        // Celdas del mes anterior (relleno)
        const celdas = [];
        const mesAnterior  = month === 1 ? 12 : month - 1;
        const yearAnterior = month === 1 ? year - 1 : year;
        const diasMesAnt   = new Date(yearAnterior, mesAnterior, 0).getDate();

        for (let i = diaInicio - 1; i >= 0; i--) {
            const dia = diasMesAnt - i;
            const fechaISO = `${yearAnterior}-${pad(mesAnterior)}-${pad(dia)}`;
            celdas.push({ dia, otroMes: true, esHoy: false, citas: [], fechaISO });
        }

        // Celdas del mes actual
        const hoyISO = `${hoy.getFullYear()}-${pad(hoy.getMonth()+1)}-${pad(hoy.getDate())}`;
        for (let d = 1; d <= diasEnMes; d++) {
            const fechaISO = `${year}-${pad(month)}-${pad(d)}`;
            celdas.push({
                dia: d,
                otroMes: false,
                esHoy: fechaISO === hoyISO,
                citas: citasPorDia[fechaISO] || [],
                fechaISO
            });
        }

        // Celdas del mes siguiente (relleno hasta completar 6 filas = 42 celdas)
        const mesSiguiente  = month === 12 ? 1  : month + 1;
        const yearSiguiente = month === 12 ? year + 1 : year;
        let d = 1;
        while (celdas.length < 42) {
            const fechaISO = `${yearSiguiente}-${pad(mesSiguiente)}-${pad(d)}`;
            celdas.push({ dia: d, otroMes: true, esHoy: false, citas: [], fechaISO });
            d++;
        }

        // Mes anterior / siguiente para la navegación
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear  = month === 1 ? year - 1 : year;
        const nextMonth = month === 12 ? 1  : month + 1;
        const nextYear  = month === 12 ? year + 1 : year;

        const nombresMes = [
            '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];

        res.render('citas/calendario', {
            title: 'Calendario de Citas',
            citas: citasMes,
            celdas,
            year,
            month,
            nombreMes: nombresMes[month],
            prevYear, prevMonth,
            nextYear, nextMonth,
            error: req.query.error || null,
            ok:    req.query.ok    || null
        });
    } catch (error) {
        console.error('Error cargando calendario:', error);
        res.render('citas/calendario', {
            title: 'Calendario de Citas',
            citas: [],
            celdas: [],
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            nombreMes: '',
            prevYear: 0, prevMonth: 0,
            nextYear: 0, nextMonth: 0,
            error: 'No se pudieron cargar las citas.'
        });
    }
});

// ── Editar cita (desde gestión o calendario) ────────────────────────────────
router.post('/editar/:id', async (req, res) => {
    // Detectar si el referer viene del calendario para redirigir de vuelta ahí
    const referer = req.headers.referer || '';
    const desdeCalendario = referer.includes('/calendario');

    // Construir URL de retorno con mes/año si vinimos del calendario
    let redirectBase = '/citas';
    if (desdeCalendario) {
        const url = new URL(referer);
        const year  = url.searchParams.get('year')  || '';
        const month = url.searchParams.get('month') || '';
        redirectBase = `/citas/calendario${year ? `?year=${year}&month=${month}` : ''}`;
    }

    try {
        let hora = req.body.Hora;
        if (hora && hora.length === 5) hora += ':00';

        await citasModel.actualizarCita(req.params.id, {
            Fecha:  req.body.Fecha  || null,
            Hora:   hora            || null,
            Estado: req.body.Estado || null
        });

        // Añadir flag de éxito si venimos del calendario
        const sep = redirectBase.includes('?') ? '&' : '?';
        res.redirect(desdeCalendario ? `${redirectBase}${sep}ok=1` : '/citas');
    } catch (error) {
        console.error('Error actualizando cita:', error.message);
        const msg = encodeURIComponent(error.message);
        const sep = redirectBase.includes('?') ? '&' : '?';
        res.redirect(`${redirectBase}${sep}error=${msg}`);
    }
});

module.exports = router;
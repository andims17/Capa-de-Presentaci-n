const { sql, getPool } = require('../config/db');

function formatHora(horaObj) {
    if (!horaObj) return '-';
    const h = horaObj.getUTCHours().toString().padStart(2, '0');
    const m = horaObj.getUTCMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
}

function formatFecha(fechaObj) {
    if (!fechaObj) return '-';
    return new Date(fechaObj).toLocaleDateString('es-CR', { timeZone: 'UTC' });
}

function formatFechaISO(fechaObj) {
    if (!fechaObj) return '';
    return new Date(fechaObj).toISOString().split('T')[0];
}

const MENSAJES_ERROR = {
    'CONFLICTO_VETERINARIO':      'El horario seleccionado ya está ocupado. Hay otra cita dentro de los 60 minutos siguientes.',
    'CONFLICTO_TRANSPORTE':       'No se puede cambiar la cita a esta hora. El transportista ya tiene una asignación cercana (1h dentro del GAM, 2h30 fuera del GAM).',
    'SERVICIO_INVALIDO':          'Actualmente solo se soporta el servicio de Grooming.',
    'TRANSPORTE_DATOS_INVALIDOS': 'Debe seleccionar un transporte válido y el tipo (Ida/Vuelta/Ambos).',
    'MASCOTA_SIN_PESO':           'La mascota debe tener un peso registrado mayor a 0 para calcular el costo de grooming.',
    'PROVINCIA_REQUERIDA':        'La provincia del cliente es requerida para calcular el costo de transporte.',
};

function parsearError(err) {
    const raw = err.originalError?.info?.message || err.message || '';
    const codigo = Object.keys(MENSAJES_ERROR).find(c => raw.includes(c));
    return codigo
        ? MENSAJES_ERROR[codigo]
        : 'Ocurrió un error al guardar la cita. Intenta de nuevo.';
}

async function listarCitas(fecha = null, clienteId = null) {
    const pool = await getPool();
    const request = pool.request();

    if (fecha) {
        request.input('FechaInicio', sql.Date, fecha);
        request.input('FechaFin',    sql.Date, fecha);
    }
    if (clienteId) request.input('ClienteId', sql.Int, clienteId);

    const result = await request.execute('sp_Citas_Listar');

    return result.recordset.map(cita => ({
        ...cita,
        FechaISO: formatFechaISO(cita.Fecha),
        Hora:     formatHora(cita.Hora),
        Fecha:    formatFecha(cita.Fecha),
        TransporteNecesario: cita.TransporteNecesario === 1 || cita.TransporteNecesario === true
    }));
}

async function listarCitasPorRango(fechaInicio, fechaFin, clienteId = null) {
    const pool = await getPool();
    const request = pool.request();

    request.input('FechaInicio', sql.Date, fechaInicio);
    request.input('FechaFin',    sql.Date, fechaFin);
    if (clienteId) request.input('ClienteId', sql.Int, clienteId);

    const result = await request.execute('sp_Citas_Listar');

    return result.recordset.map(cita => ({
        ...cita,
        FechaISO: formatFechaISO(cita.Fecha),
        Hora:     formatHora(cita.Hora),
        Fecha:    formatFecha(cita.Fecha),
        TransporteNecesario: cita.TransporteNecesario === 1 || cita.TransporteNecesario === true
    }));
}

async function obtenerCitaPorId(id) {
    const pool = await getPool();
    const result = await pool.request()
        .input('Id', sql.Int, id)
        .execute('sp_Citas_ObtenerPorId');

    const cita = result.recordset[0];
    if (cita) {
        if (cita.Hora)  cita.Hora     = formatHora(cita.Hora);
        if (cita.Fecha) {
            cita.FechaISO = formatFechaISO(cita.Fecha);
            cita.Fecha    = formatFecha(cita.Fecha);
        }
    }
    return cita;
}

async function actualizarCita(id, data) {
    const pool = await getPool();

    let hora = data.Hora;
    if (hora && hora.length === 5) hora += ':00';

    try {
        await pool.request()
            .input('Id',     sql.Int,     id)
            .input('Fecha',  sql.Date,    data.Fecha  || null)
            .input('Hora',   sql.Time,    hora        || null)
            .input('Estado', sql.VarChar, data.Estado || null)
            .execute('sp_Citas_Actualizar');
    } catch (err) {
        throw new Error(parsearError(err));
    }
}

module.exports = {
    listarCitas,
    listarCitasPorRango,
    obtenerCitaPorId,
    actualizarCita
};
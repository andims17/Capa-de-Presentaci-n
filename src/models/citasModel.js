const { pool } = require('../config/db');

function formatHora(val) {
  if (!val) return '-';
  if (typeof val === 'string') return val.substring(0, 5);
  const h = val.getUTCHours().toString().padStart(2, '0');
  const m = val.getUTCMinutes().toString().padStart(2, '0');
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

// mysql2 devuelve las columnas DECIMAL como string ("10000.00") para no
// perder precision. Sin convertirlas, el "+" concatena en vez de sumar:
// "10000.00" + "20000.00" -> "10000.0020000.00".
function aNumero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

const MENSAJES_ERROR = {
  'CONFLICTO_VETERINARIO':      'El horario seleccionado ya está ocupado. Hay otra cita dentro de los 60 minutos siguientes.',
  'CONFLICTO_TRANSPORTE':       'No se puede cambiar la cita a esta hora. El transportista ya tiene una asignación cercana.',
  'SERVICIO_INVALIDO':          'Actualmente solo se soporta el servicio de Grooming.',
  'TRANSPORTE_DATOS_INVALIDOS': 'Debe seleccionar un transporte válido y el tipo (Ida/Vuelta/Ambos).',
  'MASCOTA_SIN_PESO':           'La mascota debe tener un peso registrado mayor a 0.',
  'PROVINCIA_REQUERIDA':        'La provincia del cliente es requerida para calcular el costo de transporte.',
};

function parsearError(err) {
  const raw = err.message || '';
  const codigo = Object.keys(MENSAJES_ERROR).find(c => raw.includes(c));
  return codigo ? MENSAJES_ERROR[codigo] : 'Ocurrió un error al guardar la cita. Intenta de nuevo.';
}

async function listarCitas(fecha = null, clienteId = null) {
  const [rows] = await pool.execute('CALL sp_Citas_Listar(?,?,?)', [
    fecha || null, fecha || null, clienteId || null
  ]);
  return rows[0].map(cita => ({
    ...cita,
    CostoGrooming:   aNumero(cita.CostoGrooming),
    CostoTransporte: aNumero(cita.CostoTransporte),
    FechaISO: formatFechaISO(cita.Fecha),
    Hora:     formatHora(cita.Hora),
    Fecha:    formatFecha(cita.Fecha),
    TransporteNecesario: cita.TransporteNecesario === 1 || cita.TransporteNecesario === true
  }));
}

async function listarCitasPorRango(fechaInicio, fechaFin, clienteId = null) {
  const [rows] = await pool.execute('CALL sp_Citas_Listar(?,?,?)', [
    fechaInicio || null, fechaFin || null, clienteId || null
  ]);
  return rows[0].map(cita => ({
    ...cita,
    CostoGrooming:   aNumero(cita.CostoGrooming),
    CostoTransporte: aNumero(cita.CostoTransporte),
    FechaISO: formatFechaISO(cita.Fecha),
    Hora:     formatHora(cita.Hora),
    Fecha:    formatFecha(cita.Fecha),
    TransporteNecesario: cita.TransporteNecesario === 1 || cita.TransporteNecesario === true
  }));
}

async function obtenerCitaPorId(id) {
  const [rows] = await pool.execute('CALL sp_Citas_ObtenerPorId(?)', [id]);
  const cita = rows[0][0];
  if (cita) {
    cita.CostoGrooming   = aNumero(cita.CostoGrooming);
    cita.CostoTransporte = aNumero(cita.CostoTransporte);
    if (cita.Hora)  cita.Hora     = formatHora(cita.Hora);
    if (cita.Fecha) {
      cita.FechaISO = formatFechaISO(cita.Fecha);
      cita.Fecha    = formatFecha(cita.Fecha);
    }
  }
  return cita;
}

async function actualizarCita(id, data) {
  let hora = data.Hora;
  if (hora && hora.length === 5) hora += ':00';
  try {
    await pool.execute('CALL sp_Citas_Actualizar(?,?,?,?,?,?,?)', [
      id, data.Fecha || null, hora || null,
      data.Estado || null,
      data.TransporteNecesario ?? null,
      data.TipoTransporte || null,
      data.TransporteId || null
    ]);
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
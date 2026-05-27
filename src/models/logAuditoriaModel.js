const { pool } = require('../config/db');

function formatearNombreEvento(codigoEvento) {
  if (!codigoEvento) return 'Evento del sistema';
  return String(codigoEvento)
    .split('_').filter(Boolean)
    .map(parte => parte.charAt(0) + parte.slice(1).toLowerCase())
    .join(' ');
}

async function obtenerOCrearTipoEvento(codigo, nombreEvento = null) {
  const [rows] = await pool.execute(
    'SELECT Id FROM TiposEventoLog WHERE Codigo = ? LIMIT 1', [codigo]
  );
  if (rows[0]) return rows[0].Id;

  const [result] = await pool.execute(
    'INSERT IGNORE INTO TiposEventoLog (Codigo, Nombre) VALUES (?,?)',
    [codigo, nombreEvento || formatearNombreEvento(codigo)]
  );
  if (result.insertId) return result.insertId;

  // Si hubo race condition, buscar de nuevo
  const [rows2] = await pool.execute(
    'SELECT Id FROM TiposEventoLog WHERE Codigo = ? LIMIT 1', [codigo]
  );
  return rows2[0]?.Id;
}

async function registrarEvento({ codigoEvento, nombreEvento = null, actorUsuarioId = null, usuarioAfectadoId = null, detalle = null, ip = null, datos = null }) {
  try {
    const tipoEventoId = await obtenerOCrearTipoEvento(codigoEvento, nombreEvento);
    if (!tipoEventoId) return;

    await pool.execute(
      'INSERT INTO LogAuditoria (TipoEventoId, ActorUsuarioId, UsuarioAfectadoId, Detalle, Ip, DatosJson) VALUES (?,?,?,?,?,?)',
      [tipoEventoId, actorUsuarioId || null, usuarioAfectadoId || null,
       detalle || null, ip || null, datos ? JSON.stringify(datos) : null]
    );
  } catch (error) {
    console.error('Error registrando evento de auditoría:', error.message);
  }
}

async function listarEventos({ desde = null, hasta = null, tipoEventoId = null, actorUsuarioId = null, usuarioAfectadoId = null } = {}) {
  const [rows] = await pool.execute(`
    SELECT
      l.Id, l.Fecha,
      t.Id AS TipoEventoId, t.Nombre AS TipoEvento, t.Codigo AS TipoCodigo,
      l.Detalle, l.Ip,
      actor.Id AS ActorId, actor.Username AS ActorUsername,
      afectado.Id AS UsuarioAfectadoId, afectado.Username AS UsuarioAfectadoUsername
    FROM LogAuditoria l
    INNER JOIN TiposEventoLog t ON t.Id = l.TipoEventoId
    LEFT JOIN Usuarios actor    ON actor.Id = l.ActorUsuarioId
    LEFT JOIN Usuarios afectado ON afectado.Id = l.UsuarioAfectadoId
    WHERE (? IS NULL OR DATE(l.Fecha) >= ?)
      AND (? IS NULL OR DATE(l.Fecha) <= ?)
      AND (? IS NULL OR l.TipoEventoId = ?)
      AND (? IS NULL OR l.ActorUsuarioId = ?)
      AND (? IS NULL OR l.UsuarioAfectadoId = ?)
    ORDER BY l.Fecha DESC, l.Id DESC
  `, [
    desde || null, desde || null,
    hasta || null, hasta || null,
    tipoEventoId || null, tipoEventoId || null,
    actorUsuarioId || null, actorUsuarioId || null,
    usuarioAfectadoId || null, usuarioAfectadoId || null
  ]);
  return rows;
}

async function listarTiposEvento() {
  const [rows] = await pool.execute('SELECT Id, Codigo, Nombre FROM TiposEventoLog ORDER BY Nombre');
  return rows;
}

async function limpiarEventosPorCategoria(categoria = 'reportes') {
  if (categoria === 'reportes') {
    const [result] = await pool.execute(`
      DELETE l FROM LogAuditoria l
      INNER JOIN TiposEventoLog t ON t.Id = l.TipoEventoId
      WHERE t.Codigo LIKE 'REP\\_%' OR t.Codigo LIKE 'RPT\\_%'
    `);
    return result.affectedRows || 0;
  }
  return 0;
}

module.exports = {
  registrarEvento,
  listarEventos,
  listarTiposEvento,
  limpiarEventosPorCategoria
};

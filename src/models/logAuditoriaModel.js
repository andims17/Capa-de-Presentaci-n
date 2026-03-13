const { sql, getPool } = require('../config/db');

async function registrarEvento({ codigoEvento, actorUsuarioId = null, usuarioAfectadoId = null, detalle = null, ip = null, datos = null }) {
  try {
    const pool = await getPool();

    const tipoResult = await pool.request()
      .input('Codigo', sql.VarChar(60), codigoEvento)
      .query('SELECT TOP 1 Id FROM dbo.TiposEventoLog WHERE Codigo = @Codigo');

    const tipoEventoId = tipoResult.recordset[0]?.Id;
    if (!tipoEventoId) return;

    await pool.request()
      .input('TipoEventoId', sql.Int, tipoEventoId)
      .input('ActorUsuarioId', sql.Int, actorUsuarioId)
      .input('UsuarioAfectadoId', sql.Int, usuarioAfectadoId)
      .input('Detalle', sql.NVarChar(300), detalle)
      .input('Ip', sql.NVarChar(45), ip)
      .input('DatosJson', sql.NVarChar(sql.MAX), datos ? JSON.stringify(datos) : null)
      .query(`
        INSERT INTO dbo.LogAuditoria (TipoEventoId, ActorUsuarioId, UsuarioAfectadoId, Detalle, Ip, DatosJson)
        VALUES (@TipoEventoId, @ActorUsuarioId, @UsuarioAfectadoId, @Detalle, @Ip, @DatosJson)
      `);
  } catch (error) {
    console.error('Error registrando evento de auditoría:', error.message);
  }
}

async function listarEventos({ desde = null, hasta = null, tipoEventoId = null, actorUsuarioId = null, usuarioAfectadoId = null } = {}) {
  const pool = await getPool();
  const request = pool.request();

  request.input('Desde', sql.Date, desde || null);
  request.input('Hasta', sql.Date, hasta || null);
  request.input('TipoEventoId', sql.Int, tipoEventoId || null);
  request.input('ActorUsuarioId', sql.Int, actorUsuarioId || null);
  request.input('UsuarioAfectadoId', sql.Int, usuarioAfectadoId || null);

  const result = await request.query(`
    SELECT
      l.Id,
      l.Fecha,
      t.Id AS TipoEventoId,
      t.Nombre AS TipoEvento,
      t.Codigo AS TipoCodigo,
      l.Detalle,
      l.Ip,
      actor.Id AS ActorId,
      actor.Username AS ActorUsername,
      afectado.Id AS UsuarioAfectadoId,
      afectado.Username AS UsuarioAfectadoUsername
    FROM dbo.LogAuditoria l
    INNER JOIN dbo.TiposEventoLog t ON t.Id = l.TipoEventoId
    LEFT JOIN dbo.Usuarios actor ON actor.Id = l.ActorUsuarioId
    LEFT JOIN dbo.Usuarios afectado ON afectado.Id = l.UsuarioAfectadoId
    WHERE (@Desde IS NULL OR CONVERT(date, l.Fecha) >= @Desde)
      AND (@Hasta IS NULL OR CONVERT(date, l.Fecha) <= @Hasta)
      AND (@TipoEventoId IS NULL OR l.TipoEventoId = @TipoEventoId)
      AND (@ActorUsuarioId IS NULL OR l.ActorUsuarioId = @ActorUsuarioId)
      AND (@UsuarioAfectadoId IS NULL OR l.UsuarioAfectadoId = @UsuarioAfectadoId)
    ORDER BY l.Fecha DESC, l.Id DESC
  `);

  return result.recordset;
}

async function listarTiposEvento() {
  const pool = await getPool();
  const result = await pool.request()
    .query('SELECT Id, Codigo, Nombre FROM dbo.TiposEventoLog ORDER BY Nombre');

  return result.recordset;
}

module.exports = {
  registrarEvento,
  listarEventos,
  listarTiposEvento
};

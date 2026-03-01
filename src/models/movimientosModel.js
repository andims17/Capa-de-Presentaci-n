const { sql, getPool } = require('../config/db');

async function listarMovimientos(filters = {}) {
    const pool = await getPool();
    const request = pool.request();

    const { desde, hasta, productoId } = filters;

    // Declarar parámetros
    request.input('ProductoId', sql.Int, productoId || null);
    request.input('FechaDesde', sql.Date, desde || null);
    request.input('FechaHasta', sql.Date, hasta || null);

    const query = `
    SELECT 
        m.Fecha AS Fecha,
        m.Tipo AS Accion,
        m.Cantidad,
        p.Id AS ProductoId,
        p.Nombre AS Producto,
        u.NombreCompleto AS Usuario,
        m.Detalle AS Referencia
    FROM Movimientos m
    INNER JOIN Productos p ON m.ProductoId = p.Id
    LEFT JOIN Usuarios u ON m.UsuarioId = u.Id
    WHERE ( @ProductoId IS NULL OR m.ProductoId = @ProductoId )
      AND ( @FechaDesde IS NULL OR CONVERT(date, m.Fecha) >= @FechaDesde )
      AND ( @FechaHasta IS NULL OR CONVERT(date, m.Fecha) <= @FechaHasta )
    ORDER BY m.Fecha DESC`;

    const result = await request.query(query);
    return result.recordset;
}

module.exports = { listarMovimientos };

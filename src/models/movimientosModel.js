const { sql, getPool } = require('../config/db');

async function listarMovimientos(filters = {}) {
    const pool = await getPool();
    const request = pool.request();

    const { desde, hasta, productoId } = filters;

    if (productoId) request.input('ProductoId', sql.Int, productoId);
    if (desde) request.input('FechaDesde', sql.Date, desde);
    if (hasta) request.input('FechaHasta', sql.Date, hasta);

    const query = `
    SELECT c.Fecha AS Fecha, 'Entrada' AS Accion, pd.Cantidad, p.Id AS ProductoId, p.Nombre AS Producto, u.NombreCompleto AS Usuario, 'Compra' AS Referencia
    FROM ComprasDetalle pd
    INNER JOIN Compras c ON pd.CompraId = c.Id
    INNER JOIN Productos p ON pd.ProductoId = p.Id
    LEFT JOIN Usuarios u ON c.UsuarioId = u.Id
    WHERE ( @ProductoId IS NULL OR pd.ProductoId = @ProductoId )
      AND ( @FechaDesde IS NULL OR CONVERT(date, c.Fecha) >= @FechaDesde )
      AND ( @FechaHasta IS NULL OR CONVERT(date, c.Fecha) <= @FechaHasta )

    UNION ALL

    SELECT v.Fecha AS Fecha, 'Salida' AS Accion, vd.Cantidad, p.Id AS ProductoId, p.Nombre AS Producto, u.NombreCompleto AS Usuario, 'Venta' AS Referencia
    FROM VentasDetalle vd
    INNER JOIN Ventas v ON vd.VentaId = v.Id
    INNER JOIN Productos p ON vd.ProductoId = p.Id
    LEFT JOIN Usuarios u ON v.UsuarioId = u.Id
    WHERE ( @ProductoId IS NULL OR vd.ProductoId = @ProductoId )
      AND ( @FechaDesde IS NULL OR CONVERT(date, v.Fecha) >= @FechaDesde )
      AND ( @FechaHasta IS NULL OR CONVERT(date, v.Fecha) <= @FechaHasta )

    ORDER BY Fecha DESC`;

    const result = await request.query(query);
    return result.recordset;
}

module.exports = { listarMovimientos };

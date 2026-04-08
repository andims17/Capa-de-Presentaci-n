const { sql, getPool } = require('../config/db');

async function listarMovimientos(filters = {}) {
    const pool = await getPool();
    const { desde, hasta, productoId } = filters;

    const result = await pool.request()
        .input('ProductoId', sql.Int,  productoId || null)
        .input('FechaDesde', sql.Date, desde      || null)
        .input('FechaHasta', sql.Date, hasta      || null)
        .execute('dbo.sp_Movimientos_Listar');

    return result.recordset;
}

async function registrarMovimiento({ tipo, productoId, cantidad, usuarioId = null, detalle = null, stockPrevio = null, stockNuevo = null }) {
    try {
        const pool = await getPool();
        await pool.request()
            .input('Tipo',        sql.VarChar(50),   tipo)
            .input('ProductoId',  sql.Int,           productoId)
            .input('Cantidad',    sql.Int,           cantidad)
            .input('UsuarioId',   sql.Int,           usuarioId   || null)
            .input('Detalle',     sql.NVarChar(250), detalle     || null)
            .input('StockPrevio', sql.Int,           stockPrevio)
            .input('StockNuevo',  sql.Int,           stockNuevo)
            .execute('dbo.sp_Movimientos_Insertar');
    } catch (error) {
        console.error('Error registrando movimiento:', error.message);
    }
}

module.exports = { listarMovimientos, registrarMovimiento };

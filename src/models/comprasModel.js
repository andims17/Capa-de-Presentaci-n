const { sql, getPool } = require('../config/db');

async function listarCompras() {
    const pool = await getPool();
    const result = await pool.request().execute('sp_Compras_Listar');
    return result.recordset;
}

async function obtenerCompraPorId(id) {
    const pool = await getPool();
    const result = await pool.request()
        .input('Id', sql.Int, id)
        .execute('sp_Compras_ObtenerPorId');
    return result.recordset[0];
}

async function listarDetalleCompra(compraId) {
    const pool = await getPool();
    const result = await pool.request()
        .input('CompraId', sql.Int, compraId)
        .execute('sp_ComprasDetalle_ListarPorCompra');
    return result.recordset;
}

async function insertarCompra({ proveedorId, usuarioId, detalle }) {
    const pool = await getPool();

    const detalleJSON = JSON.stringify(detalle);

    const result = await pool.request()
        .input('ProveedorId', sql.Int, proveedorId)
        .input('UsuarioId', sql.Int, usuarioId)
        .input('DetalleJSON', sql.NVarChar(sql.MAX), detalleJSON)
        .execute('sp_Compras_Insertar');

    return result.recordset[0];
}

async function setActivo(id, activo) {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.Int, id)
        .input('Activo', sql.Bit, activo)
        .execute('sp_Compras_SetActivo');
}

async function resumenCompras() {
    const pool = await getPool();
    const result = await pool.request().execute('sp_Compras_Resumen');
    return result.recordset[0];
}

module.exports = {
    listarCompras,
    obtenerCompraPorId,
    listarDetalleCompra,
    insertarCompra,
    setActivo,
    resumenCompras
};
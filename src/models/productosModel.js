const { sql, getPool } = require('../config/db');

async function listarProductos() {
    const pool = await getPool();
    const result = await pool.request()
        .execute('sp_Productos_Listar');
    return result.recordset;
}

async function obtenerProductoPorId(id) {
    const pool = await getPool();
    const result = await pool.request()
        .input('Id', sql.Int, id)
        .execute('sp_Productos_ObtenerPorId');
    return result.recordset[0];
}

async function insertarProducto(p) {
    const pool = await getPool();
    await pool.request()
        .input('CategoriaId', sql.Int, p.CategoriaId)
        .input('Nombre', sql.NVarChar, p.Nombre)
        .input('Codigo', sql.NVarChar, p.Codigo)
        .input('Precio', sql.Decimal(10, 2), p.Precio)
        .input('Stock', sql.Int, p.Stock)
        .input('StockMinimo', sql.Int, p.StockMinimo)
        .execute('sp_Productos_Insertar');
}

async function actualizarProducto(p) {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.Int, p.Id)
        .input('CategoriaId', sql.Int, p.CategoriaId) // ✅ YA CORRECTO
        .input('Nombre', sql.NVarChar, p.Nombre)
        .input('Codigo', sql.NVarChar, p.Codigo)
        .input('Precio', sql.Decimal(10, 2), p.Precio)
        .input('Stock', sql.Int, p.Stock)
        .input('StockMinimo', sql.Int, p.StockMinimo)
        .execute('sp_Productos_Actualizar');
}

async function eliminarProducto(id) {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.Int, id)
        .execute('sp_Productos_Eliminar');
}

async function listarCategorias() {
    const pool = await getPool();
    const result = await pool.request()
        .query('SELECT Id, Nombre FROM Categorias');
    return result.recordset;
}

async function resumenInventario() {
    const pool = await getPool();
    const result = await pool.request()
        .execute('sp_Productos_ResumenInventario');
    return result.recordset[0];
}

async function existeCodigo(codigo) {
    const pool = await getPool();
    const result = await pool.request()
        .input('Codigo', sql.VarChar, codigo)
        .query('SELECT COUNT(*) AS total FROM Productos WHERE Codigo = @Codigo');
    return result.recordset[0].total > 0;
}


module.exports = {
    listarProductos,
    obtenerProductoPorId,
    insertarProducto,
    actualizarProducto,
    eliminarProducto,
    listarCategorias,
    resumenInventario,
        existeCodigo
};

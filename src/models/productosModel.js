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
    return result.recordset[0];   // ya debe traer ProveedorId
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
        .input('ImagenUrl', sql.NVarChar(500), p.ImagenUrl || null)
        .input('ProveedorId', sql.Int, p.ProveedorId || null)
        .execute('sp_Productos_Insertar');
}

async function actualizarProducto(p) {
    const pool = await getPool();
    const request = pool.request();
    
    // Obtener stock anterior
    const resultAnterior = await request.input('Id', sql.Int, p.Id)
        .query('SELECT Stock FROM Productos WHERE Id = @Id');
    const stockAnterior = resultAnterior.recordset[0]?.Stock || 0;
    const stockNuevo = Number(p.Stock);
    
    // Actualizar producto
    await pool.request()
        .input('Id', sql.Int, p.Id)
        .input('CategoriaId', sql.Int, p.CategoriaId)
        .input('Nombre', sql.NVarChar, p.Nombre)
        .input('Codigo', sql.NVarChar, p.Codigo)
        .input('Precio', sql.Decimal(10, 2), p.Precio)
        .input('Stock', sql.Int, p.Stock)
        .input('StockMinimo', sql.Int, p.StockMinimo)
        .input('ImagenUrl', sql.NVarChar(500), p.ImagenUrl || null)
        .input('ProveedorId', sql.Int, p.ProveedorId || null)
        .execute('sp_Productos_Actualizar');
    
    // Registrar movimiento si el stock cambió
    if (stockAnterior !== stockNuevo) {
        const diferencia = stockNuevo - stockAnterior;
        const tipo = diferencia > 0 ? 'Entrada' : 'Salida';
        
        await pool.request()
            .input('Fecha', sql.DateTime, new Date())
            .input('Tipo', sql.VarChar(50), tipo)
            .input('ProductoId', sql.Int, p.Id)
            .input('Cantidad', sql.Int, Math.abs(diferencia))
            .input('UsuarioId', sql.Int, null)
            .input('Detalle', sql.NVarChar(250), 'Ajuste manual de inventario')
            .input('StockPrevio', sql.Int, stockAnterior)
            .input('StockNuevo', sql.Int, stockNuevo)
            .query(`INSERT INTO Movimientos (Fecha, Tipo, ProductoId, Cantidad, UsuarioId, Detalle, StockPrevio, StockNuevo)
                    VALUES (@Fecha, @Tipo, @ProductoId, @Cantidad, @UsuarioId, @Detalle, @StockPrevio, @StockNuevo)`);
    }
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

async function obtenerProductoPorCodigo(codigo) {
    const pool = await getPool();
    const result = await pool.request()
        .input('Codigo', sql.NVarChar(50), codigo)
        .execute('sp_Productos_ObtenerPorCodigo');

    return result.recordset[0];
}


module.exports = {
    listarProductos,
    obtenerProductoPorId,
    insertarProducto,
    actualizarProducto,
    eliminarProducto,
    listarCategorias,
    resumenInventario,
    existeCodigo,
    obtenerProductoPorCodigo
};

const { sql, getPool } = require('../config/db');

async function listarClientes() {
    const pool = await getPool();
    const result = await pool.request().execute('sp_Clientes_Listar');
    return result.recordset;
}

async function obtenerClientePorId(id) {
    const pool = await getPool();
    const result = await pool.request()
        .input('Id', sql.Int, id)
        .execute('sp_Clientes_ObtenerPorId');
    return result.recordset[0];
}

async function insertarCliente(c) {
    const pool = await getPool();
    await pool.request()
        .input('NombreCompleto', sql.NVarChar(150), c.NombreCompleto)
        .input('Email', sql.NVarChar(150), c.Email || null)
        .input('Telefono', sql.NVarChar(30), c.Telefono || null)
        .input('Direccion', sql.NVarChar(200), c.Direccion || null)
        .execute('sp_Clientes_Insertar');
}

async function actualizarCliente(c) {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.Int, c.Id)
        .input('NombreCompleto', sql.NVarChar(150), c.NombreCompleto)
        .input('Email', sql.NVarChar(150), c.Email || null)
        .input('Telefono', sql.NVarChar(30), c.Telefono || null)
        .input('Direccion', sql.NVarChar(200), c.Direccion || null)
        .execute('sp_Clientes_Actualizar');
}

async function setActivo(id, activo) {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.Int, id)
        .input('Activo', sql.Bit, activo)
        .execute('sp_Clientes_SetActivo');
}

async function eliminarCliente(id) {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.Int, id)
        .execute('sp_Clientes_Eliminar');
}

module.exports = {
    listarClientes,
    obtenerClientePorId,
    insertarCliente,
    actualizarCliente,
    eliminarCliente,
    setActivo
};

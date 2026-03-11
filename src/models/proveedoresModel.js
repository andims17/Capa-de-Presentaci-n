const { sql, getPool } = require('../config/db');

async function listarProveedores() {
    const pool = await getPool();
    const result = await pool.request().execute('sp_Proveedores_Listar');
    return result.recordset;
}

async function obtenerProveedorPorId(id) {
    const pool = await getPool();
    const result = await pool.request()
        .input('Id', sql.Int, id)
        .execute('sp_Proveedores_ObtenerPorId');
    return result.recordset[0];
}

async function insertarProveedor(p) {
    const pool = await getPool();
    await pool.request()
        .input('Nombre', sql.NVarChar, p.Nombre)
        .input('Email', sql.NVarChar, p.Email)
        .input('Telefono', sql.NVarChar, p.Telefono)
        .input('Direccion', sql.NVarChar, p.Direccion)
        .execute('sp_Proveedores_Insertar');
}

async function actualizarProveedor(p) {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.Int, p.Id)
        .input('Nombre', sql.NVarChar, p.Nombre)
        .input('Email', sql.NVarChar, p.Email)
        .input('Telefono', sql.NVarChar, p.Telefono)
        .input('Direccion', sql.NVarChar, p.Direccion)
        .execute('sp_Proveedores_Actualizar');
}

async function eliminarProveedor(id) {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.Int, id)
        .execute('sp_Proveedores_Eliminar');
}

module.exports = {
    listarProveedores,
    obtenerProveedorPorId,
    insertarProveedor,
    actualizarProveedor,
    eliminarProveedor
};
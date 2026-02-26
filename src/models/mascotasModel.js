const { sql, getPool } = require('../config/db');

async function listarMascotas() {
    const pool = await getPool();
    const result = await pool.request().execute('sp_Mascota_Listar');
    return result.recordset;
}

async function insertarMascota(m) {
    const pool = await getPool();
    await pool.request()
        .input('ClienteId', sql.Int, m.ClienteId)
        .input('Nombre', sql.NVarChar(100), m.Nombre)
        .input('Especie', sql.NVarChar(50), m.Especie)
        .input('Raza', sql.NVarChar(50), m.Raza)
        .input('Sexo', sql.NVarChar(10), m.Sexo)
        .input('FechaNacimiento', sql.Date, m.FechaNacimiento || null)
        .input('TieneAlergias', sql.Bit, m.TieneAlergias === 'on' ? 1 : 0) 
        .input('NotasAlergias', sql.NVarChar(sql.MAX), m.NotasAlergias)
        .input('Peso', sql.Decimal(5, 2), m.Peso || null)
        .execute('sp_Mascota_Insertar');
}

async function actualizarMascota(m) {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.Int, m.Id)
        .input('ClienteId', sql.Int, m.ClienteId)
        .input('Nombre', sql.NVarChar(100), m.Nombre)
        .input('Especie', sql.NVarChar(50), m.Especie)
        .input('Raza', sql.NVarChar(50), m.Raza)
        .input('Sexo', sql.NVarChar(10), m.Sexo)
        .input('FechaNacimiento', sql.Date, m.FechaNacimiento || null)
        .input('TieneAlergias', sql.Bit, m.TieneAlergias === 'on' ? 1 : 0)
        .input('NotasAlergias', sql.NVarChar(sql.MAX), m.NotasAlergias)
        .input('Peso', sql.Decimal(5, 2), m.Peso || null)
        .execute('sp_Mascota_Actualizar');
}

async function eliminarMascota(id) {
    const pool = await getPool();
    await pool.request()
        .input('Id', sql.Int, id)
        .execute('dbo.sp_Mascota_Eliminar'); 
}
module.exports = { 
    listarMascotas, 
    insertarMascota, 
    actualizarMascota,
    eliminarMascota
};
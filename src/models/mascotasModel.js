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
        .input('FechaNacimiento', sql.Date, m.FechaNacimiento)
        .execute('sp_Mascota_Insertar');
}

module.exports = {
    listarMascotas,
    insertarMascota
};

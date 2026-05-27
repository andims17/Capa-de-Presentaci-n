const { pool } = require('../config/db');

async function listarMascotas() {
  const [rows] = await pool.execute('CALL sp_Mascota_Listar()');
  return rows[0];
}

async function insertarMascota(m) {
  await pool.execute('CALL sp_Mascota_Insertar(?,?,?,?,?,?,?,?,?)', [
    m.ClienteId, m.Nombre, m.Especie, m.Raza, m.Sexo,
    m.FechaNacimiento || null,
    m.TieneAlergias === 'on' ? 1 : 0,
    m.NotasAlergias || null,
    m.Peso || null
  ]);
}

async function actualizarMascota(m) {
  await pool.execute('CALL sp_Mascota_Actualizar(?,?,?,?,?,?,?,?,?,?)', [
    m.Id, m.ClienteId, m.Nombre, m.Especie, m.Raza, m.Sexo,
    m.FechaNacimiento || null,
    m.TieneAlergias === 'on' ? 1 : 0,
    m.NotasAlergias || null,
    m.Peso || null
  ]);
}

async function eliminarMascota(id) {
  await pool.execute('CALL sp_Mascota_Eliminar(?)', [id]);
}

module.exports = {
  listarMascotas,
  insertarMascota,
  actualizarMascota,
  eliminarMascota
};

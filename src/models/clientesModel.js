const { pool } = require('../config/db');

async function listarClientes() {
  const [rows] = await pool.execute('CALL sp_Clientes_Listar()');
  return rows[0];
}

async function obtenerClientePorId(id) {
  const [rows] = await pool.execute('CALL sp_Clientes_ObtenerPorId(?)', [id]);
  return rows[0][0];
}

async function insertarCliente(c) {
  await pool.execute('CALL sp_Clientes_Insertar(?,?,?,?)', [
    c.NombreCompleto, c.Email || null, c.Telefono || null, c.Direccion || null
  ]);
}

async function actualizarCliente(c) {
  await pool.execute('CALL sp_Clientes_Actualizar(?,?,?,?,?)', [
    c.Id, c.NombreCompleto, c.Email || null, c.Telefono || null, c.Direccion || null
  ]);
}

async function setActivo(id, activo) {
  await pool.execute('CALL sp_Clientes_SetActivo(?,?)', [id, activo]);
}

async function eliminarCliente(id) {
  await pool.execute('CALL sp_Clientes_Eliminar(?)', [id]);
}

module.exports = {
  listarClientes,
  obtenerClientePorId,
  insertarCliente,
  actualizarCliente,
  eliminarCliente,
  setActivo
};

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
  await pool.execute('CALL sp_Clientes_Insertar(?,?,?,?,?)', [
    c.NombreCompleto, c.Cedula || null, c.Email || null,
    c.Telefono || null, c.Direccion || null
  ]);
}

async function actualizarCliente(c) {
  await pool.execute('CALL sp_Clientes_Actualizar(?,?,?,?,?,?)', [
    c.Id, c.NombreCompleto, c.Cedula || null, c.Email || null,
    c.Telefono || null, c.Direccion || null
  ]);
}

// TC-036: verificar correo duplicado antes de guardar.
// excluirId es el Id del cliente que se esta editando (0 al crear).
async function existeEmail(email, excluirId = 0) {
  if (!email || !String(email).trim()) return false;
  const [rows] = await pool.execute('CALL sp_Clientes_ExisteEmail(?,?)', [
    String(email).trim(), excluirId || 0
  ]);
  return (rows[0][0]?.Existe ?? 0) > 0;
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
  existeEmail,
  eliminarCliente,
  setActivo
};

const { pool } = require('../config/db');

async function listarProveedores() {
  const [rows] = await pool.execute('CALL sp_Proveedores_Listar()');
  return rows[0];
}

async function obtenerProveedorPorId(id) {
  const [rows] = await pool.execute('CALL sp_Proveedores_ObtenerPorId(?)', [id]);
  return rows[0][0];
}

async function insertarProveedor(p) {
  await pool.execute('CALL sp_Proveedores_Insertar(?,?,?,?)', [
    p.Nombre, p.Email, p.Telefono, p.Direccion
  ]);
}

async function actualizarProveedor(p) {
  await pool.execute('CALL sp_Proveedores_Actualizar(?,?,?,?,?)', [
    p.Id, p.Nombre, p.Email, p.Telefono, p.Direccion
  ]);
}

async function eliminarProveedor(id) {
  await pool.execute('CALL sp_Proveedores_Eliminar(?)', [id]);
}

module.exports = {
  listarProveedores,
  obtenerProveedorPorId,
  insertarProveedor,
  actualizarProveedor,
  eliminarProveedor
};

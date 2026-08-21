const { pool } = require('../config/db');
const { registrarMovimiento } = require('./movimientosModel');

async function listarProductos() {
  const [rows] = await pool.execute('CALL sp_Productos_Listar()');
  return rows[0];
}

async function obtenerProductoPorId(id) {
  const [rows] = await pool.execute('CALL sp_Productos_ObtenerPorId(?)', [id]);
  return rows[0][0];
}

async function insertarProducto(p) {
  await pool.execute('CALL sp_Productos_Insertar(?,?,?,?,?,?,?,?)', [
    p.CategoriaId, p.Nombre, p.Codigo, p.Precio,
    p.Stock, p.StockMinimo, p.ImagenUrl || null, p.ProveedorId || null
  ]);
}

async function actualizarProducto(p) {
  // Obtener stock anterior
  const [stockRows] = await pool.execute('SELECT Stock FROM Productos WHERE Id = ?', [p.Id]);
  const stockAnterior = stockRows[0]?.Stock || 0;
  const stockNuevo = Number(p.Stock);

  await pool.execute('CALL sp_Productos_Actualizar(?,?,?,?,?,?,?,?,?)', [
    p.Id, p.CategoriaId, p.Nombre, p.Codigo, p.Precio,
    p.Stock, p.StockMinimo, p.ImagenUrl || null, p.ProveedorId || null
  ]);

  if (stockAnterior !== stockNuevo) {
    const diferencia = stockNuevo - stockAnterior;
    await registrarMovimiento({
      tipo:        diferencia > 0 ? 'Entrada' : 'Salida',
      productoId:  p.Id,
      cantidad:    Math.abs(diferencia),
      usuarioId:   p.UsuarioId || null,
      detalle:     'Ajuste manual de inventario',
      stockPrevio: stockAnterior,
      stockNuevo
    });
  }
}

async function eliminarProducto(id) {
  await pool.execute('CALL sp_Productos_Eliminar(?)', [id]);
}

async function listarCategorias() {
  const [rows] = await pool.execute('SELECT Id, Nombre FROM Categorias');
  return rows;
}

async function resumenInventario() {
  const [rows] = await pool.execute('CALL sp_Productos_ResumenInventario()');
  return rows[0][0];
}

// TC-028: duplicados por codigo (SKU).
// excluirId permite editar un producto sin que choque consigo mismo.
async function existeCodigo(codigo, excluirId = null) {
  if (!codigo) return false;
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM Productos
     WHERE Codigo = ? AND (? IS NULL OR Id <> ?)`,
    [String(codigo).trim(), excluirId, excluirId]
  );
  return rows[0].total > 0;
}

// TC-028: duplicados por nombre.
// El collation de la base es utf8mb4_unicode_ci, asi que
// "Shampoo Antipulgas" y "shampoo antipulgas" cuentan como iguales.
async function existeNombre(nombre, excluirId = null) {
  if (!nombre) return false;
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM Productos
     WHERE Nombre = ? AND (? IS NULL OR Id <> ?)`,
    [String(nombre).trim(), excluirId, excluirId]
  );
  return rows[0].total > 0;
}

async function obtenerProductoPorCodigo(codigo) {
  const [rows] = await pool.execute('CALL sp_Productos_ObtenerPorCodigo(?)', [codigo]);
  return rows[0][0];
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
  existeNombre,
  obtenerProductoPorCodigo
};

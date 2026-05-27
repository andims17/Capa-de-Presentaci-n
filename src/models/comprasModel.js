const { pool } = require('../config/db');
const { registrarMovimiento } = require('./movimientosModel');

async function listarCompras() {
  const [rows] = await pool.execute('CALL sp_Compras_Listar()');
  return rows[0];
}

async function obtenerCompraPorId(id) {
  const [rows] = await pool.execute('CALL sp_Compras_ObtenerPorId(?)', [id]);
  return rows[0][0];
}

async function listarDetalleCompra(compraId) {
  const [rows] = await pool.execute('CALL sp_ComprasDetalle_ListarPorCompra(?)', [compraId]);
  return rows[0];
}

async function insertarCompra({ proveedorId, usuarioId, detalle }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Obtener stocks previos
    const stocksPrevios = {};
    for (const item of detalle) {
      const [r] = await conn.execute('SELECT Stock FROM Productos WHERE Id = ?', [item.ProductoId]);
      stocksPrevios[item.ProductoId] = r[0]?.Stock ?? 0;
    }

    // Crear tabla temporal y llenarla
    await conn.execute(`CREATE TEMPORARY TABLE IF NOT EXISTS tmp_compra_detalle 
      (ProductoId INT, Cantidad INT, CostoUnitario DECIMAL(10,2))`);
    await conn.execute('DELETE FROM tmp_compra_detalle');

    for (const item of detalle) {
      await conn.execute('INSERT INTO tmp_compra_detalle VALUES (?,?,?)', [
        item.ProductoId, item.Cantidad, item.CostoUnitario
      ]);
    }

    const [result] = await conn.execute('CALL sp_Compras_Insertar(?,?)', [proveedorId, usuarioId]);
    const compraId = result[0][0]?.CompraId;

    await conn.commit();

    // Registrar movimientos
    for (const item of detalle) {
      const stockPrev  = stocksPrevios[item.ProductoId] ?? 0;
      const stockNuevo = stockPrev + item.Cantidad;
      await registrarMovimiento({
        tipo: 'Entrada', productoId: item.ProductoId, cantidad: item.Cantidad,
        usuarioId, detalle: `Compra #${compraId}`, stockPrevio: stockPrev, stockNuevo
      });
    }

    return { CompraId: compraId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function setActivo(id, activo) {
  await pool.execute('CALL sp_Compras_SetActivo(?,?)', [id, activo]);
}

async function resumenCompras() {
  const [rows] = await pool.execute('CALL sp_Compras_Resumen()');
  return rows[0][0];
}

module.exports = {
  listarCompras,
  obtenerCompraPorId,
  listarDetalleCompra,
  insertarCompra,
  setActivo,
  resumenCompras
};

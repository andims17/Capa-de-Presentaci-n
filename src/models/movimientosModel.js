const { pool } = require('../config/db');

async function listarMovimientos(filters = {}) {
  const { desde, hasta, productoId } = filters;
  const [rows] = await pool.execute('CALL sp_Movimientos_Listar(?,?,?)', [
    productoId || null, desde || null, hasta || null
  ]);
  return rows[0];
}

async function registrarMovimiento({ tipo, productoId, cantidad, usuarioId = null, detalle = null, stockPrevio = null, stockNuevo = null }) {
  try {
    await pool.execute('CALL sp_Movimientos_Insertar(?,?,?,?,?,?,?)', [
      tipo, productoId, cantidad, usuarioId || null,
      detalle || null, stockPrevio, stockNuevo
    ]);
  } catch (error) {
    console.error('Error registrando movimiento:', error.message);
  }
}

module.exports = { listarMovimientos, registrarMovimiento };

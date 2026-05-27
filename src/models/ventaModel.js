const { pool } = require('../config/db');
const { registrarMovimiento } = require('./movimientosModel');

async function buscarProductos(termino) {
  const [rows] = await pool.execute('CALL sp_Ventas_BuscarProductos(?)', [termino]);
  return rows[0];
}

async function procesarVenta({ clienteId, usuarioId, total, productos }) {
  const conn = await pool.getConnection();
  try {
    // Stocks previos
    const stocksPrevios = {};
    for (const p of productos) {
      const [r] = await conn.execute('SELECT Stock FROM Productos WHERE Id = ?', [parseInt(p.ProductoId)]);
      stocksPrevios[p.ProductoId] = r[0]?.Stock ?? 0;
    }

    // Tabla temporal
    await conn.execute(`CREATE TEMPORARY TABLE IF NOT EXISTS tmp_venta_detalle 
      (ProductoId INT, Cantidad INT, Precio DECIMAL(10,2))`);
    await conn.execute('DELETE FROM tmp_venta_detalle');

    for (const p of productos) {
      await conn.execute('INSERT INTO tmp_venta_detalle VALUES (?,?,?)', [
        parseInt(p.ProductoId), parseInt(p.Cantidad), parseFloat(p.Precio)
      ]);
    }

    const [result] = await conn.execute('CALL sp_Ventas_ProcesarVenta(?,?,?)', [
      clienteId ? parseInt(clienteId) : 0,
      parseInt(usuarioId),
      parseFloat(total)
    ]);

    const ventaId = result[0][0]?.VentaId;
    conn.release();

    // Registrar movimientos
    for (const p of productos) {
      const cantidad   = parseInt(p.Cantidad);
      const stockPrev  = stocksPrevios[p.ProductoId] ?? 0;
      const stockNuevo = stockPrev - cantidad;
      await registrarMovimiento({
        tipo: 'Salida', productoId: parseInt(p.ProductoId), cantidad,
        usuarioId: parseInt(usuarioId), detalle: `Venta #${ventaId}`,
        stockPrevio: stockPrev, stockNuevo
      });
    }

    return result[0][0];
  } catch (err) {
    conn.release();
    throw err;
  }
}

async function listarClientesPOS() {
  const [rows] = await pool.execute('CALL sp_Ventas_ListarClientesPOS()');
  return rows[0];
}

async function agendarCitaDesdePOS(datos) {
  const mapaTransporte = {
    'Solo Ida':     'Ida',
    'Solo Vuelta':  'Vuelta',
    'Ida y Vuelta': 'Ambos'
  };
  const tipoTransporteSP = datos.TipoTransporte
    ? (mapaTransporte[datos.TipoTransporte] || datos.TipoTransporte)
    : null;
  const transporteId = datos.TransporteNecesario ? 1 : null;

  const [rows] = await pool.execute('CALL sp_Citas_Insertar(?,?,?,?,?,?,?,?,?)', [
    parseInt(datos.MascotaId),
    datos.UsuarioId || 1,
    datos.Fecha,
    datos.Hora,
    datos.Servicio || 'Grooming',
    datos.TransporteNecesario ? 1 : 0,
    tipoTransporteSP,
    transporteId,
    datos.Provincia || null
  ]);

  return rows[0][0] || { success: true };
}

async function calcularPrecioGrooming(mascotaId, requiereTransporte, provincia, tipoTransporte) {
  const [pesoRows] = await pool.execute('SELECT Peso FROM Mascotas WHERE Id = ?', [parseInt(mascotaId)]);
  if (!pesoRows || pesoRows.length === 0) throw new Error('Mascota no encontrada');

  const peso = parseFloat(pesoRows[0].Peso);
  if (!peso || peso <= 0) throw new Error('La mascota no tiene un peso registrado.');

  let costoGrooming;
  if      (peso <= 2)  costoGrooming = 7000;
  else if (peso <= 4)  costoGrooming = 10000;
  else if (peso <= 7)  costoGrooming = 13000;
  else if (peso <= 10) costoGrooming = 16000;
  else                 costoGrooming = 20000;

  let costoTransporte = 0;
  if (requiereTransporte && provincia) {
    const gam = ['San José', 'Heredia', 'Alajuela', 'Cartago'];
    const baseProvincia = gam.includes(provincia) ? 10000 : 25000;
    costoTransporte = tipoTransporte === 'Ambos' ? baseProvincia * 2 : baseProvincia;
  }

  return { peso, costoGrooming, costoTransporte, total: costoGrooming + costoTransporte };
}

async function listarHistorialVentas(fechaDesde, fechaHasta) {
  const [rows] = await pool.execute('CALL sp_Ventas_Historial(?,?)', [
    fechaDesde || null, fechaHasta || null
  ]);
  const ventas   = rows[0] || [];
  const detalles = rows[1] || [];

  const detalleMap = {};
  detalles.forEach(d => {
    if (!detalleMap[d.VentaId]) detalleMap[d.VentaId] = [];
    detalleMap[d.VentaId].push(d);
  });

  return ventas.map(v => ({ ...v, Productos: detalleMap[v.VentaId] || [] }));
}

async function resumenReportes() {
  const [r1] = await pool.execute('CALL sp_Reportes_ResumenVentas()');
  const [r2] = await pool.execute('CALL sp_Reportes_TopProductos()');
  const [r3] = await pool.execute('CALL sp_Reportes_TopClientes()');
  const [r4] = await pool.execute('CALL sp_Reportes_VentasPorDia()');
  const [r5] = await pool.execute('CALL sp_Reportes_EstadoCitas()');
  const [r6] = await pool.execute('CALL sp_Reportes_ProductosBajoStock()');

  return {
    ventas:             r1[0][0],
    topProductos:       r2[0],
    topClientes:        r3[0],
    ventasPorDia:       r4[0],
    citas:              r5[0][0],
    productosBajoStock: r6[0][0]?.ProductosBajoStock || 0
  };
}

module.exports = {
  buscarProductos,
  procesarVenta,
  listarClientesPOS,
  agendarCitaDesdePOS,
  calcularPrecioGrooming,
  listarHistorialVentas,
  resumenReportes
};

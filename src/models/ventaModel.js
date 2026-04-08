const { getPool, sql } = require('../config/db');

async function buscarProductos(termino) {
  const pool = await getPool();
  const result = await pool.request()
    .input('Termino', sql.NVarChar(100), termino)
    .execute('dbo.sp_Ventas_BuscarProductos');
  return result.recordset;
}

async function procesarVenta({ clienteId, usuarioId, total, productos }) {
  const pool = await getPool();
  const detalleJSON = JSON.stringify(productos.map(p => ({
    ProductoId: parseInt(p.ProductoId), 
    Cantidad: parseInt(p.Cantidad),
    Precio: parseFloat(p.Precio)
  })));

  try {
    const result = await pool.request()
      .input('ClienteId', sql.Int, parseInt(clienteId) || null) 
      .input('UsuarioId', sql.Int, parseInt(usuarioId))
      .input('Total', sql.Decimal(10, 2), parseFloat(total))
      .input('DetalleJSON', sql.NVarChar(sql.MAX), detalleJSON)
      .execute('dbo.sp_Ventas_ProcesarVenta');
    return result.recordset[0];
  } catch (error) {
    console.error("Error en ejecución de SP sp_Ventas_ProcesarVenta:", error.message);
    throw error;
  }
}

async function listarClientesPOS() {
  const pool = await getPool();
  const result = await pool.request().execute('dbo.sp_Ventas_ListarClientesPOS');
  return result.recordset;
}

async function agendarCitaDesdePOS(datos) {
    const pool = await getPool();
    const mapaTransporte = {
        'Solo Ida':     'Ida',
        'Solo Vuelta':  'Vuelta',
        'Ida y Vuelta': 'Ambos'
    };
    const tipoTransporteSP = datos.TipoTransporte
        ? (mapaTransporte[datos.TipoTransporte] || datos.TipoTransporte)
        : null;

    const transporteId = datos.TransporteNecesario ? 1 : null;

    try {
        const result = await pool.request()
            .input('MascotaId',           sql.Int,          parseInt(datos.MascotaId))
            .input('UsuarioId',           sql.Int,          datos.UsuarioId || 1)
            .input('Fecha',               sql.Date,         datos.Fecha)
            .input('Hora',                sql.Time,         datos.Hora)
            .input('Servicio',            sql.VarChar(100), datos.Servicio || 'Grooming')
            .input('TransporteNecesario', sql.Bit,          datos.TransporteNecesario ? 1 : 0)
            .input('TipoTransporte',      sql.VarChar(20),  tipoTransporteSP)
            .input('TransporteId',        sql.Int,          transporteId)
            .input('Provincia',           sql.VarChar(50),  datos.Provincia)
            .execute('dbo.sp_Citas_Insertar');

        return result.recordset ? result.recordset : { success: true };
    } catch (error) {
        console.error("Error al ejecutar sp_Citas_Insertar:", error.message);
        throw error;
    }
}

async function calcularPrecioGrooming(mascotaId, requiereTransporte, provincia, tipoTransporte) {
  const pool = await getPool();
  const result = await pool.request()
    .input('MascotaId', sql.Int, parseInt(mascotaId))
    .query('SELECT Peso FROM dbo.Mascotas WHERE Id = @MascotaId');

  if (!result.recordset || result.recordset.length === 0) {
    throw new Error('Mascota no encontrada');
  }

  const peso = parseFloat(result.recordset[0].Peso);
  if (!peso || peso <= 0) {
    throw new Error('La mascota no tiene un peso registrado. Registre el peso para calcular el precio de grooming.');
  }
  let costoGrooming;
  if (peso <= 2)       costoGrooming = 7000;
  else if (peso <= 4)  costoGrooming = 10000;
  else if (peso <= 7)  costoGrooming = 13000;
  else if (peso <= 10) costoGrooming = 16000;
  else                 costoGrooming = 20000;

  let costoTransporte = 0;
  if (requiereTransporte && provincia) {
    const gam = ['San José', 'Heredia', 'Alajuela', 'Cartago'];
    const baseProvincia = gam.includes(provincia) ? 10000 : 25000;
    if (tipoTransporte === 'Ida y Vuelta') {
      costoTransporte = baseProvincia; 
    } else {
      costoTransporte = baseProvincia / 2;  
    }
  }

  return {
    peso,
    costoGrooming,
    costoTransporte,
    total: costoGrooming + costoTransporte
  };
}


async function listarHistorialVentas(fechaDesde, fechaHasta) {
  const pool = await getPool();
  const req = pool.request();

  if (fechaDesde) req.input('FechaDesde', sql.Date, fechaDesde);
  else            req.input('FechaDesde', sql.Date, null);

  if (fechaHasta) req.input('FechaHasta', sql.Date, fechaHasta);
  else            req.input('FechaHasta', sql.Date, null);

  const result = await req.execute('dbo.sp_Ventas_Historial');

  const ventas   = result.recordsets[0] || [];
  const detalles = result.recordsets[1] || [];

  const detalleMap = {};
  detalles.forEach(d => {
    if (!detalleMap[d.VentaId]) detalleMap[d.VentaId] = [];
    detalleMap[d.VentaId].push(d);
  });

  return ventas.map(v => ({
    ...v,
    Productos: detalleMap[v.VentaId] || []
  }));
}

module.exports = {
  buscarProductos,
  procesarVenta,
  listarClientesPOS,
  agendarCitaDesdePOS,
  calcularPrecioGrooming,
  listarHistorialVentas
};

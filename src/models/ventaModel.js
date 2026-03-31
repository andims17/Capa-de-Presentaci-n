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
    try {
        const result = await pool.request()
            .input('MascotaId', sql.Int, parseInt(datos.MascotaId))
            .input('UsuarioId', sql.Int, datos.UsuarioId || 1)
            .input('Fecha', sql.Date, datos.Fecha)
            .input('Hora', sql.Time, datos.Hora)
            .input('Servicio', sql.VarChar(100), datos.Servicio || 'Grooming')
            .input('TransporteNecesario', sql.Bit, datos.TransporteNecesario ? 1 : 0)
            .input('TipoTransporte', sql.VarChar(20), datos.TipoTransporte || null)
            .input('Provincia', sql.VarChar(50), datos.Provincia)
            .execute('dbo.sp_Citas_Insertar');

        return result.recordset ? result.recordset : { success: true };
    } catch (error) {
        console.error("Error al ejecutar sp_Citas_Insertar:", error.message);
        throw error;
    }
}

module.exports = {
  buscarProductos,
  procesarVenta,
  listarClientesPOS,
  agendarCitaDesdePOS
};
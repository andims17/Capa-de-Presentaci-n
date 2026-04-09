const { getPool, sql } = require('../config/db');
const { registrarMovimiento } = require('./movimientosModel');

async function buscarProductos(termino) {
    const pool = await getPool();
    const result = await pool.request()
        .input('Termino', sql.NVarChar(100), termino)
        .execute('dbo.sp_Ventas_BuscarProductos');
    return result.recordset;
}

async function procesarVenta({ clienteId, usuarioId, total, productos }) {
    const pool = await getPool();

    const stocksPrevios = {};
    for (const p of productos) {
        const r = await pool.request()
            .input('ProductoId', sql.Int, parseInt(p.ProductoId))
            .execute('dbo.sp_Productos_ObtenerStock');
        stocksPrevios[p.ProductoId] = r.recordset[0]?.Stock ?? 0;
    }

    const detalleJSON = JSON.stringify(productos.map(p => ({
        ProductoId: parseInt(p.ProductoId),
        Cantidad:   parseInt(p.Cantidad),
        Precio:     parseFloat(p.Precio)
    })));

    const result = await pool.request()
        .input('ClienteId',   sql.Int,              clienteId ? parseInt(clienteId) : null)
        .input('UsuarioId',   sql.Int,              parseInt(usuarioId))
        .input('Total',       sql.Decimal(10, 2),   parseFloat(total))
        .input('DetalleJSON', sql.NVarChar(sql.MAX), detalleJSON)
        .execute('dbo.sp_Ventas_ProcesarVenta');

    const ventaId = result.recordset[0]?.VentaId;
    for (const p of productos) {
        const cantidad   = parseInt(p.Cantidad);
        const stockPrev  = stocksPrevios[p.ProductoId] ?? 0;
        const stockNuevo = stockPrev - cantidad;

        await registrarMovimiento({
            tipo:        'Salida',
            productoId:  parseInt(p.ProductoId),
            cantidad,
            usuarioId:   parseInt(usuarioId),
            detalle:     `Venta #${ventaId}`,
            stockPrevio: stockPrev,
            stockNuevo
        });
    }

    return result.recordset[0];
}

async function listarClientesPOS() {
    const pool = await getPool();
    const result = await pool.request()
        .execute('dbo.sp_Ventas_ListarClientesPOS');
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

    return result.recordset?.[0] || { success: true };
}

async function calcularPrecioGrooming(mascotaId, requiereTransporte, provincia, tipoTransporte) {
    const pool = await getPool();
    const result = await pool.request()
        .input('ProductoId', sql.Int, parseInt(mascotaId))
        .execute('dbo.sp_Productos_ObtenerStock');
    const pesoResult = await pool.request()
        .input('MascotaId', sql.Int, parseInt(mascotaId))
        .query('SELECT Peso FROM dbo.Mascotas WHERE Id = @MascotaId');

    if (!pesoResult.recordset || pesoResult.recordset.length === 0)
        throw new Error('Mascota no encontrada');

    const peso = parseFloat(pesoResult.recordset[0].Peso);
    if (!peso || peso <= 0)
        throw new Error('La mascota no tiene un peso registrado.');

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
    const pool = await getPool();
    const req  = pool.request();
    req.input('FechaDesde', sql.Date, fechaDesde || null);
    req.input('FechaHasta', sql.Date, fechaHasta || null);

    const result = await req.execute('dbo.sp_Ventas_Historial');
    const ventas   = result.recordsets[0] || [];
    const detalles = result.recordsets[1] || [];

    const detalleMap = {};
    detalles.forEach(d => {
        if (!detalleMap[d.VentaId]) detalleMap[d.VentaId] = [];
        detalleMap[d.VentaId].push(d);
    });

    return ventas.map(v => ({ ...v, Productos: detalleMap[v.VentaId] || [] }));
}

async function resumenReportes() {
    const pool = await getPool();
    const [
        ventasResult,
        topProductosResult,
        topClientesResult,
        ventasPorDiaResult,
        citasResult,
        stockResult
    ] = await Promise.all([
        pool.request().execute('dbo.sp_Reportes_ResumenVentas'),
        pool.request().execute('dbo.sp_Reportes_TopProductos'),
        pool.request().execute('dbo.sp_Reportes_TopClientes'),
        pool.request().execute('dbo.sp_Reportes_VentasPorDia'),
        pool.request().execute('dbo.sp_Reportes_EstadoCitas'),
        pool.request().execute('dbo.sp_Reportes_ProductosBajoStock')
    ]);

    return {
        ventas:             ventasResult.recordset[0],
        topProductos:       topProductosResult.recordset,
        topClientes:        topClientesResult.recordset,
        ventasPorDia:       ventasPorDiaResult.recordset,
        citas:              citasResult.recordset[0],
        productosBajoStock: stockResult.recordset[0]?.ProductosBajoStock || 0
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

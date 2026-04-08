const express = require('express');
const router = express.Router();
const productosModel   = require('../models/productosModel');
const movimientosModel = require('../models/movimientosModel');
const { resumenReportes } = require('../models/ventaModel');
const { getAllUsers } = require('../models/usuarioModel');
const { listarEventos, listarTiposEvento, registrarEvento, limpiarEventosPorCategoria } = require('../models/logAuditoriaModel');
const { requireAdmin } = require('../middlewares/auth');

function obtenerIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || null;
}

function obtenerCategoriaBitacora(codigoEvento) {
  if (!codigoEvento) return 'usuarios';
  const codigo = String(codigoEvento).toUpperCase();
  if (codigo.startsWith('REP_') || codigo.startsWith('RPT_')) return 'reportes';
  return 'usuarios';
}

const CODIGOS_OCULTOS_BITACORA = new Set(['REP_VER_BITACORA']);

function tieneFiltrosHistorial({ desde, hasta, producto }) {
  return Boolean(desde || hasta || producto);
}

async function registrarEventoReporte(req, codigoEvento, nombreEvento, detalle, datos = null) {
  await registrarEvento({
    codigoEvento,
    nombreEvento,
    actorUsuarioId:   req.session.user?.id ?? null,
    usuarioAfectadoId: null,
    detalle,
    ip:   obtenerIp(req),
    datos
  });
}

router.get('/', async (req, res) => {
  try {
    await registrarEventoReporte(
      req,
      'REP_VER_PANEL',
      'Acceso al panel de reportes',
      'El usuario ingresó al panel principal de reportes'
    );

    const datos = await resumenReportes();

    res.render('reportes/index', {
      title: 'Reportes y Estadísticas',
      ventas:             datos.ventas,
      topProductos:       datos.topProductos,
      topClientes:        datos.topClientes,
      ventasPorDia:       datos.ventasPorDia,
      citas:              datos.citas,
      productosBajoStock: datos.productosBajoStock
    });
  } catch (error) {
    console.error('Error cargando panel de reportes:', error);
    res.render('reportes/index', {
      title: 'Reportes y Estadísticas',
      ventas:             { TotalVentas: 0, IngresosTotales: 0, VentasMes: 0, IngresosMes: 0 },
      topProductos:       [],
      topClientes:        [],
      ventasPorDia:       [],
      citas:              { TotalCitas: 0, Pendientes: 0, Confirmadas: 0, Canceladas: 0 },
      productosBajoStock: 0
    });
  }
});

router.get('/historial', async (req, res) => {
  try {
    const desde    = req.query.desde   || null;
    const hasta    = req.query.hasta   || null;
    const producto = req.query.producto ? parseInt(req.query.producto) : null;

    const [productos, movimientos] = await Promise.all([
      productosModel.listarProductos(),
      movimientosModel.listarMovimientos({ desde, hasta, productoId: producto })
    ]);

    const esConsultaFiltrada = tieneFiltrosHistorial({ desde, hasta, producto });

    await registrarEventoReporte(
      req,
      esConsultaFiltrada ? 'REP_FILTRAR_HISTORIAL' : 'REP_VER_HISTORIAL',
      esConsultaFiltrada ? 'Filtrado de historial de inventario' : 'Consulta de historial de inventario',
      esConsultaFiltrada
        ? 'El usuario consultó el historial usando filtros'
        : 'El usuario consultó el historial completo de movimientos',
      { desde, hasta, producto, totalResultados: movimientos.length }
    );

    res.render('reportes/historial', {
      title:      'Historial de Movimientos',
      productos,
      movimientos,
      filtros:    { desde, hasta, producto }
    });
  } catch (error) {
    console.error('Error cargando historial de movimientos:', error);
    res.render('reportes/historial', {
      title:      'Historial de Movimientos',
      productos:  [],
      movimientos:[],
      filtros:    {}
    });
  }
});

router.post('/accion', async (req, res) => {
  try {
    const { codigoEvento, nombreEvento, detalle, datos } = req.body || {};
    if (!codigoEvento || !nombreEvento || !detalle)
      return res.status(400).json({ ok: false, error: 'Datos incompletos' });

    await registrarEventoReporte(req, codigoEvento, nombreEvento, detalle, datos || null);
    return res.json({ ok: true });
  } catch (error) {
    console.error('Error registrando acción de reportes:', error);
    return res.status(500).json({ ok: false, error: 'No se pudo registrar la acción' });
  }
});

router.post('/logs/limpiar', requireAdmin, async (req, res) => {
  try {
    const seccion = req.body?.seccion === 'reportes' ? 'reportes' : 'usuarios';
    if (seccion !== 'reportes')
      return res.redirect('/reportes/logs?seccion=usuarios&msg=solo_reportes');

    const eliminados = await limpiarEventosPorCategoria('reportes');
    await registrarEventoReporte(
      req,
      'REP_LIMPIEZA_EVENTOS',
      'Limpieza de eventos de reportes',
      `El usuario limpió ${eliminados} eventos de la sección reportes`,
      { eliminados }
    );

    return res.redirect(`/reportes/logs?seccion=reportes&msg=limpieza_ok&count=${eliminados}`);
  } catch (error) {
    console.error('Error limpiando eventos de reportes:', error);
    return res.redirect('/reportes/logs?seccion=reportes&msg=limpieza_error');
  }
});

router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const seccion  = req.query.seccion === 'reportes' ? 'reportes' : 'usuarios';
    const mensaje  = req.query.msg   || null;
    const count    = Number.parseInt(req.query.count, 10);

    await registrarEventoReporte(
      req,
      'REP_VER_BITACORA',
      'Consulta de bitácora del sistema',
      `El usuario consultó la bitácora del sistema en la sección ${seccion}`,
      { seccion }
    );

    const [todosEventosRaw, tiposEvento, usuarios] = await Promise.all([
      listarEventos({}),
      listarTiposEvento(),
      getAllUsers()
    ]);

    const todosEventos = todosEventosRaw.filter(
      evento => !CODIGOS_OCULTOS_BITACORA.has(String(evento.TipoCodigo || '').toUpperCase())
    );

    const resumenCategorias = todosEventos.reduce((acc, evento) => {
      const categoria = obtenerCategoriaBitacora(evento.TipoCodigo);
      acc[categoria] = (acc[categoria] || 0) + 1;
      return acc;
    }, { usuarios: 0, reportes: 0 });

    const eventos = todosEventos.filter(
      evento => obtenerCategoriaBitacora(evento.TipoCodigo) === seccion
    );

    res.render('reportes/logs', {
      title:             'Bitácora de Auditoría',
      eventos,
      resumenCategorias,
      totalEventos:      todosEventos.length,
      seccionActiva:     seccion,
      mensaje,
      cantidadEliminada: Number.isFinite(count) ? count : 0,
      tiposEvento,
      usuarios,
      filtros:           { seccion }
    });
  } catch (error) {
    console.error('Error cargando bitácora:', error);
    res.status(500).send('Error cargando bitácora');
  }
});

module.exports = router;

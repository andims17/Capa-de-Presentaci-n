const express = require('express');
const router = express.Router();
const productosModel = require('../models/productosModel');
const movimientosModel = require('../models/movimientosModel');
const { getAllUsers } = require('../models/usuarioModel');
const { listarEventos, listarTiposEvento } = require('../models/logAuditoriaModel');
const { requireAdmin } = require('../middlewares/auth');

router.get('/', (req, res) => {
  res.render('reportes/index', { title: 'Reportes y Estadísticas' });
});

router.get('/historial', async (req, res) => {
  try {
    const desde = req.query.desde || null;
    const hasta = req.query.hasta || null;
    const producto = req.query.producto ? parseInt(req.query.producto) : null;

    const productos = await productosModel.listarProductos();
    const movimientos = await movimientosModel.listarMovimientos({ desde, hasta, productoId: producto });

    res.render('reportes/historial', {
      title: 'Historial de Movimientos',
      productos,
      movimientos,
      filtros: { desde, hasta, producto }
    });
  } catch (error) {
    console.error('Error cargando historial de movimientos:', error);
    res.render('reportes/historial', { title: 'Historial de Movimientos', productos: [], movimientos: [], filtros: {} });
  }
});

router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const [eventos, tiposEvento, usuarios] = await Promise.all([
      listarEventos({}),
      listarTiposEvento(),
      getAllUsers()
    ]);
    res.render('reportes/logs', {
      title: 'Bitácora de Auditoría',
      eventos,
      tiposEvento,
      usuarios,
      filtros: {}
    });
  } catch (error) {
    console.error('Error cargando bitácora:', error);
    res.status(500).send('Error cargando bitácora');
  }
});

module.exports = router;

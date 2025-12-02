const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('ventas/index', { title: 'Punto de Venta' });
});

router.get('/historial', (req, res) => {
  res.render('ventas/historial', { title: 'Historial de Ventas' });
});

module.exports = router;

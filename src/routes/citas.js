const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('citas/index', { title: 'Gestión de Citas' });
});

router.get('/calendario', (req, res) => {
  res.render('citas/calendario', { title: 'Calendario de Citas' });
});

module.exports = router;

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('proveedores/index', { title: 'Gestión de Proveedores' });
});

module.exports = router;


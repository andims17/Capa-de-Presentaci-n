const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('mascota/index', { title: 'Gestión de Mascotas' });
});

module.exports = router;

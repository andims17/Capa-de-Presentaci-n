const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('usuarios/index', { title: 'Gestión de Usuarios' });
});

module.exports = router;

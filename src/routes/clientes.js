const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('clientes/index', { title: 'Gestión de Clientes' });
});


module.exports = router;
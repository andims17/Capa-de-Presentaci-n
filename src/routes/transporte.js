const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('transporte/index', { title: 'Gestión de Transporte' });
});

module.exports = router;

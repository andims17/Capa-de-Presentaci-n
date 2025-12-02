const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('reportes/index', { title: 'Reportes y Estadísticas' });
});

module.exports = router;

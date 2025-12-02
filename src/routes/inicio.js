const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('inicio/index', { title: 'Dashboard' });
});

router.get('/panel', (req, res) => {
  res.render('inicio/panelPrincipal', { title: 'Panel Principal' });
});

module.exports = router;

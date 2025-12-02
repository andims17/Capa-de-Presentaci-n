const express = require('express');
const router = express.Router();

router.get('/inventario', (req, res) => {
    res.render('inventario/index', { title: 'Gestión de Inventario' });
});

router.get('/inventario/compras', (req, res) => {
    res.render('inventario/compras', { title: 'Registro de Compras' });
});


module.exports = router;
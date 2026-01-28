const express = require('express');
const router = express.Router();
const productosModel = require('../models/productosModel');

router.get('/inventario', async (req, res) => {
    try {
        const productos = await productosModel.obtenerProductos();

        res.render('inventario/index', {
            title: 'Gestión de Inventario',
            productos: productos
        });

    } catch (error) {
        console.error(error);
        res.send('Error cargando inventario');
    }
});

router.get('/inventario/compras', (req, res) => {
    res.render('inventario/compras', { title: 'Registro de Compras' });
});


module.exports = router;
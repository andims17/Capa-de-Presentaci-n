const express = require('express');
const router = express.Router();
const path = require('path');

const productosModel = require(path.join(__dirname, '../models/productosModel'));
console.log('USANDO MODELO:', Object.keys(productosModel));

// ================= INVENTARIO =================
router.get('/inventario', async (req, res) => {
    try {
        const productos = await productosModel.listarProductos();
        const resumen = await productosModel.resumenInventario();
        const categorias = await productosModel.listarCategorias();

        res.render('inventario/index', {
            title: 'Gestión de Inventario',
            productos,
            resumen,
            categorias
        });
    } catch (error) {
        console.error('❌ Error cargando inventario:', error);
        res.render('inventario/index', {
            title: 'Gestión de Inventario',
            productos: [],
            resumen: {},
            categorias: []
        });
    }
});

// ================= OBTENER PRODUCTO (AJAX) =================
router.get('/inventario/:id', async (req, res) => {
    try {
        const producto = await productosModel.obtenerProductoPorId(req.params.id);
        res.json(producto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo producto' });
    }
});

// ================= CREAR =================
router.post('/inventario/crear', async (req, res) => {
    try {
        const existe = await productosModel.existeCodigo(req.body.Codigo);

        if (existe) {
            const productos = await productosModel.listarProductos();
            const resumen = await productosModel.resumenInventario();
            const categorias = await productosModel.listarCategorias();

            return res.render('inventario/index', {
                title: 'Gestión de Inventario',
                productos,
                resumen,
                categorias,
                error: '❌ Ya existe un producto con ese código'
            });
        }

        await productosModel.insertarProducto(req.body);
        res.redirect('/inventario');

    } catch (error) {
        console.error(error);
        res.send('Error creando producto');
    }
});


// ================= ACTUALIZAR =================
router.post('/inventario/actualizar', async (req, res) => {
    try {
        await productosModel.actualizarProducto(req.body);
        res.redirect('/inventario');
    } catch (error) {
        console.error('❌ Error actualizando producto:', error);
        res.send('Error actualizando producto');
    }
});

// ================= ELIMINAR =================
router.get('/inventario/eliminar/:id', async (req, res) => {
    try {
        await productosModel.eliminarProducto(req.params.id);
        res.redirect('/inventario');
    } catch (error) {
        console.error('❌ Error eliminando producto:', error);
        res.send('Error eliminando producto');
    }
});

module.exports = router;

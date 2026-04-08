const express = require('express');
const router = express.Router();
const comprasModel = require('../models/comprasModel');

router.get('/', async (req, res) => {
    try {
        const compras = await comprasModel.listarCompras();
        const resumenCompras = await comprasModel.resumenCompras();

        res.render('inventario/compras', {
        title: 'Registro de Compras',
        compras,
        resumenCompras
        });
    } catch (error) {
        console.error(error);
        res.render('inventario/Compras', {
            title: 'Registro de Compras',
            compras: [],
            resumenCompras: {
                TotalCompras: 0,
                TotalInvertido: 0,
                ComprasActivas: 0,
                ComprasDesactivadas: 0
            }
        });
    }
});

router.post('/crear', async (req, res) => {
    try {
        const proveedorId = parseInt(req.body.ProveedorId);
        const usuarioId = req.session.user?.id || 1;
        const detalleRaw = JSON.parse(req.body.DetalleJSON || '[]');

const detalle = [];

for (let item of detalleRaw) {
    const producto = await require('../models/productosModel')
        .obtenerProductoPorCodigo(item.Codigo);

    if (!producto) {
        return res.send(`Producto no encontrado: ${item.Codigo}`);
    }

    detalle.push({
        ProductoId: producto.Id,
        Cantidad: item.Cantidad,
        CostoUnitario: item.CostoUnitario
    });
}

        await comprasModel.insertarCompra({
            proveedorId,
            usuarioId,
            detalle
        });

        res.redirect('/compras');
    } catch (error) {
        console.error(error);
        res.send('Error creando compra');
    }
});

router.post('/:id/desactivar', async (req, res) => {
    try {
        await comprasModel.setActivo(req.params.id, 0);
        res.redirect('/compras');
    } catch (error) {
        console.error(error);
        res.send('Error desactivando compra');
    }
});

router.post('/:id/activar', async (req, res) => {
    try {
        await comprasModel.setActivo(req.params.id, 1);
        res.redirect('/compras');
    } catch (error) {
        console.error(error);
        res.send('Error activando compra');
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const transporteModel = require('../models/transporteModel');

router.get('/', async (req, res) => {
    try {
        const data = await transporteModel.getTransportistaConCitas();

        res.render('transporte/index', {
            title: 'Gestión de Transporte',
            transportista: data.transportista,
            citas: data.citas || []
        });
    } catch (error) {
        console.error('Error listando transporte:', error);
        res.render('transporte/index', {
            title: 'Gestión de Transporte',
            transportista: null,
            citas: [],
            error: 'No se pudo cargar la información del transportista'
        });
    }
});

router.post('/editar', async (req, res) => {
    try {
        await transporteModel.actualizarTransportista(req.body);
        res.redirect('/transporte');
    } catch (error) {
        console.error('Error actualizando transportista:', error);
        res.redirect('/transporte');
    }
});

module.exports = router;
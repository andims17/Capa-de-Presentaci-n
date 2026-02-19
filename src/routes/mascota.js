const express = require('express');
const router = express.Router();
const MascotasModel = require('../models/mascotasModel');
const ClientesModel = require('../models/clientesModel'); // para combo dueño

router.get('/', async (req, res) => {
    try {
        const mascotas = await MascotasModel.listarMascotas();
        const clientes = await ClientesModel.listarClientes();

        res.render('mascota/index', {
            title: 'Mascotas',   
            mascotas,
            clientes
        });

    } catch (error) {
        console.error('Error al listar mascotas:', error);

        res.render('mascota/index', {
            title: 'Mascotas', 
            mascotas: [],
            clientes: []
        });
    }
});


router.post('/crear', async (req, res) => {
    try {
        await MascotasModel.insertarMascota(req.body);
        res.redirect('/mascota');
    } catch (error) {
        console.error('Error al crear mascota:', error);
        res.redirect('/mascota');
    }
});

module.exports = router;

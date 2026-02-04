const express = require('express');
const router = express.Router();
const clientesModel = require('../models/clientesModel');

router.get('/', async (req, res) => {
    try {
        const clientes = await clientesModel.listarClientes();
        res.render('clientes/index', {
            title: 'Gestión de Clientes',
            clientes
        });
    } catch (error) {
        console.error(error);
        res.render('clientes/index', { title: 'Gestión de Clientes', clientes: [] });
    }
});

router.post('/crear', async (req, res) => {
    try {
        await clientesModel.insertarCliente(req.body);
        res.redirect('/clientes');
    } catch (error) {
        console.error(error);
        res.send('Error creando cliente');
    }
});

router.get('/editar/:id', async (req, res) => {
    try {
        const cliente = await clientesModel.obtenerClientePorId(req.params.id);
        if (!cliente) return res.send('Cliente no encontrado');
        res.render('clientes/editar', {
            title: 'Editar Cliente',
            cliente
        });
    } catch (error) {
        console.error(error);
        res.send('Error cargando cliente');
    }
});

router.post('/editar/:id', async (req, res) => {
    try {
        await clientesModel.actualizarCliente({
            Id: req.params.id,
            NombreCompleto: req.body.NombreCompleto,
            Telefono: req.body.Telefono,
            Email: req.body.Email,
            Direccion: req.body.Direccion
        });
        res.redirect('/clientes');
    } catch (error) {
        console.error(error);
        res.send('Error actualizando cliente');
    }
});

router.get('/eliminar/:id', async (req, res) => {
    try {
        await clientesModel.eliminarCliente(req.params.id);
        res.redirect('/clientes');
    } catch (error) {
        console.error(error);
        res.send('Error eliminando cliente');
    }
});

module.exports = router;

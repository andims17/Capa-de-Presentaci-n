const express = require('express');
const router = express.Router();
const clientesModel = require('../models/clientesModel');
const { registrarEvento } = require('../models/logAuditoriaModel');

function obtenerIp(req) {
    return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}


function validarCliente(data) {
    const telefonoRegex = /^[0-9]{8}$/;
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cedulaRegex = /^[0-9]{9}$/;

    if (data.Telefono && !telefonoRegex.test(data.Telefono))
        return "El teléfono debe tener exactamente 8 dígitos";

    if (data.Email && !correoRegex.test(data.Email))
        return "El correo electrónico no tiene un formato válido";

    if (data.Cedula && !cedulaRegex.test(data.Cedula))
        return "La cédula debe tener 9 números";

    return null;
}


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
        const errorValidacion = validarCliente(req.body);
        if (errorValidacion) return res.send(errorValidacion);

        await clientesModel.insertarCliente(req.body);

        registrarEvento({
            codigoEvento: 'CLI_CREADO',
            actorUsuarioId: req.session.user?.id ?? null,
            detalle: `Cliente creado: ${req.body.NombreCompleto}`,
            ip: obtenerIp(req)
        });

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
        const errorValidacion = validarCliente(req.body);
        if (errorValidacion) return res.send(errorValidacion);

        await clientesModel.actualizarCliente({
            Id: req.params.id,
            NombreCompleto: req.body.NombreCompleto,
            Telefono: req.body.Telefono,
            Email: req.body.Email,
            Direccion: req.body.Direccion
        });

        registrarEvento({
            codigoEvento: 'CLI_EDITADO',
            actorUsuarioId: req.session.user?.id ?? null,
            detalle: `Cliente editado: ${req.body.NombreCompleto} (ID ${req.params.id})`,
            ip: obtenerIp(req)
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

        registrarEvento({
            codigoEvento: 'CLI_ELIMINADO',
            actorUsuarioId: req.session.user?.id ?? null,
            detalle: `Cliente eliminado (ID ${req.params.id})`,
            ip: obtenerIp(req)
        });

        res.redirect('/clientes');
    } catch (error) {
        console.error(error);
        res.send('Error eliminando cliente');
    }
});

module.exports = router;

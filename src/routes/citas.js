const express = require('express');
const router = express.Router();
const citasModel = require('../models/citasModel');
const clientesModel = require('../models/clientesModel');

router.get('/', async (req, res) => {
    try {
        const fecha = req.query.fecha || null;
        const clienteId = req.query.clienteId ? Number(req.query.clienteId) : null;
        const errorMsg = req.query.error || null;

        const citas = await citasModel.listarCitas(fecha, clienteId);
        const clientes = await clientesModel.listarClientes() || [];

        res.render('citas/index', {
            title: 'Gestión de Citas',
            citas,
            clientes,
            fecha: fecha || '',
            clienteId: clienteId || '',
            error: errorMsg
        });
    } catch (error) {
        console.error('Error listando citas:', error);
        res.render('citas/index', {
            title: 'Gestión de Citas',
            citas: [],
            clientes: [],
            fecha: '',
            clienteId: '',
            error: 'No se pudieron cargar las citas.'
        });
    }
});

router.post('/editar/:id', async (req, res) => {
    try {
        let hora = req.body.Hora;
        if (hora && hora.length === 5) hora += ':00';

        await citasModel.actualizarCita(req.params.id, {
            Fecha: req.body.Fecha || null,
            Hora: hora || null,
            Estado: req.body.Estado || null
        });

        res.redirect('/citas');
    } catch (error) {
        console.error('Error actualizando cita:', error.message);
        // Redirige con el mensaje de error en query param
        const msg = encodeURIComponent(error.message);
        res.redirect(`/citas?error=${msg}`);
    }
});

module.exports = router;
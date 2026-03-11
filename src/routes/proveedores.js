const express = require('express');
const router = express.Router();
const proveedoresModel = require('../models/proveedoresModel');

function validarProveedor(data) {
    const telefonoRegex = /^[0-9]{8}$/;
    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (data.Telefono && !telefonoRegex.test(data.Telefono))
        return "El teléfono debe tener exactamente 8 dígitos";

    if (data.Email && !correoRegex.test(data.Email))
        return "El correo electrónico no tiene un formato válido";

    return null;
}

// Listado
router.get('/', async (req, res) => {
    try {
        const proveedores = await proveedoresModel.listarProveedores();
        res.render('proveedores/index', {
            title: 'Gestión de Proveedores',
            proveedores,
            error: null,          // importante para limpiar error previo
            success: null
        });
    } catch (error) {
        console.error('Error al listar proveedores:', error);
        res.render('proveedores/index', {
            title: 'Gestión de Proveedores',
            proveedores: [],
            error: 'No se pudieron cargar los proveedores'
        });
    }
});

// Crear proveedor (aquí estaba el problema principal)
router.post('/crear', async (req, res) => {
    try {
        const errorValidacion = validarProveedor(req.body);
        
        if (errorValidacion) {
            const proveedores = await proveedoresModel.listarProveedores();
            return res.render('proveedores/index', {
                title: 'Gestión de Proveedores',
                proveedores,
                error: errorValidacion,   // ← se muestra en la vista
                success: null
            });
        }

        await proveedoresModel.insertarProveedor(req.body);
        
        const proveedores = await proveedoresModel.listarProveedores();
        res.render('proveedores/index', {
            title: 'Gestión de Proveedores',
            proveedores,
            error: null,
            success: 'Proveedor creado correctamente'
        });
    } catch (error) {
        console.error('Error creando proveedor:', error);
        
        const proveedores = await proveedoresModel.listarProveedores();
        res.render('proveedores/index', {
            title: 'Gestión de Proveedores',
            proveedores,
            error: 'Error al crear el proveedor. Verifica los datos o contacta al administrador.',
            success: null
        });
    }
});

// Editar (POST desde modal)
router.post('/editar/:id', async (req, res) => {
    try {
        const errorValidacion = validarProveedor(req.body);
        if (errorValidacion) {
            const proveedores = await proveedoresModel.listarProveedores();
            return res.render('proveedores/index', {
                title: 'Gestión de Proveedores',
                proveedores,
                error: errorValidacion
            });
        }

        await proveedoresModel.actualizarProveedor({
            Id: req.params.id,
            Nombre: req.body.Nombre,
            Email: req.body.Email,
            Telefono: req.body.Telefono,
            Direccion: req.body.Direccion
        });

        res.redirect('/proveedores');
    } catch (error) {
        console.error('Error actualizando proveedor:', error);
        res.redirect('/proveedores');
    }
});

// Eliminar
router.get('/eliminar/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!/^\d+$/.test(id)) {
            return res.redirect('/proveedores');
        }

        await proveedoresModel.eliminarProveedor(Number(id));
        res.redirect('/proveedores');
    } catch (error) {
        console.error('Error eliminando proveedor:', error);
        res.redirect('/proveedores');
    }
});

module.exports = router;
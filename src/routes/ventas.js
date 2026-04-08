const express = require('express');
const router = express.Router();
const { 
    buscarProductos, 
    procesarVenta, 
    listarClientesPOS,
    agendarCitaDesdePOS,
    calcularPrecioGrooming,
    listarHistorialVentas
} = require('../models/ventaModel');
const clientesModel = require('../models/clientesModel');
const MascotasModel = require('../models/mascotasModel');

router.get('/', async (req, res) => {
    try {
        const clientes = await listarClientesPOS();
        res.render('ventas/index', { 
            title: 'Punto de Venta', 
            clientes,
            user: req.session.user || {} 
        });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al cargar la interfaz de ventas');
    }
});

router.get('/clientes/listar', async (req, res) => {
    try {
        const clientes = await clientesModel.listarClientes();
        res.json(clientes); 
    } catch (e) {
        console.error("Error al obtener clientes desde el modelo original:", e);
        res.status(500).json([]);
    }
});

router.get('/buscar', async (req, res) => {
    try {
        const productos = await buscarProductos(req.query.q || '');
        res.json(productos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/mascotas/todas', async (req, res) => {
    try {
        const mascotas = await MascotasModel.listarMascotas();
        res.json(mascotas || []);
    } catch (e) {
        console.error("Error al listar mascotas para ventas:", e.message);
        res.status(500).json([]);
    }
});

router.post('/pagar', async (req, res) => {
    try {
        const { clienteId, total, productos, datosCita } = req.body;
        const usuarioId = req.session.user?.id || 1;
        if (datosCita) {
            await agendarCitaDesdePOS({ ...datosCita, UsuarioId: usuarioId });
        }
        const productospass = productos.filter(p => p.ProductoId !== 99999);
        const resultado = await procesarVenta({
            clienteId: clienteId === 0 ? null : clienteId,
            usuarioId,
            total, 
            productos: productospass
        });

        const idVenta = resultado?.VentaId || resultado?.Id;

        if (idVenta) {
            res.json({ success: true, ventaId: idVenta });
        } else {
            res.status(400).json({ success: false, message: "La venta no devolvió un ID válido." });
        }
    } catch (e) {
        console.error("Error en proceso de pago:", e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get('/grooming/precio', async (req, res) => {
    try {
        const { mascotaId, transporte, provincia, tipoTransporte } = req.query;
        if (!mascotaId) return res.status(400).json({ error: 'Falta mascotaId' });

        const precios = await calcularPrecioGrooming(
            mascotaId,
            transporte === '1',
            provincia || null,
            tipoTransporte || null
        );
        res.json(precios);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/historial', async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        const ventas = await listarHistorialVentas(desde || null, hasta || null);
        const totalVentas   = ventas.length;
        const ingresos      = ventas.reduce((s, v) => s + parseFloat(v.Total || 0), 0);
        const clientesSet   = new Set(ventas.filter(v => v.ClienteNombre !== 'Venta General').map(v => v.ClienteNombre));
        const productosVend = ventas.reduce((s, v) => s + v.Productos.reduce((ss, p) => ss + p.Cantidad, 0), 0);

        res.render('ventas/historial', {
            title: 'Historial de Ventas',
            ventas,
            resumen: {
                totalVentas,
                ingresos,
                clientesAtendidos: clientesSet.size,
                productosVendidos: productosVend
            },
            filtros: { desde: desde || '', hasta: hasta || '' }
        });
    } catch (e) {
        console.error('Error historial ventas:', e.message);
        res.status(500).send('Error al cargar historial de ventas');
    }
});

module.exports = router;
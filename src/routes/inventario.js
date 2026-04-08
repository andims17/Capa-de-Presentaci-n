const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const productosModel = require(path.join(__dirname, '../models/productosModel'));
const comprasModel = require(path.join(__dirname, '../models/comprasModel'));

// Helper: validar id numérico (evita choque con "compras", etc.)
function esIdNumerico(id) {
  return /^\d+$/.test(String(id));
}

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vetpos_productos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const upload = multer({ storage });

// ================= INVENTARIO (LISTA) =================
// ================= INVENTARIO (LISTA) =================
router.get('/', async (req, res) => {
  try {
    const productos     = await productosModel.listarProductos();
    const resumen       = await productosModel.resumenInventario();
    const categorias    = await productosModel.listarCategorias();
    const proveedores   = await require('../models/proveedoresModel').listarProveedores();  // ← nuevo

    res.render('inventario/index', {
      title: 'Gestión de Inventario',
      productos,
      resumen,
      categorias,
      proveedores          // ← pasamos la lista completa
    });
  } catch (error) {
    console.error('❌ Error cargando inventario:', error);
    res.render('inventario/index', { /* ... */ });
  }
});

// ================= COMPRAS =================
router.get('/compras', async (req, res) => {
  try {
    const compras = await comprasModel.listarCompras();
    const resumenCompras = await comprasModel.resumenCompras();
    const proveedores = await require('../models/proveedoresModel').listarProveedores();
    const productos = await productosModel.listarProductos();

    res.render('inventario/compras', {
      title: 'Registro de Compras',
      compras,
      resumenCompras,
      proveedores,
      productos
    });
  } catch (error) {
    console.error('❌ Error cargando compras:', error);
    res.render('inventario/compras', {
      title: 'Registro de Compras',
      compras: [],
      resumenCompras: {
        TotalCompras: 0,
        TotalInvertido: 0,
        ComprasActivas: 0,
        ComprasDesactivadas: 0
      },
      proveedores: [],
      productos: []
    });
  }
});

router.post('/compras/crear', async (req, res) => {
  try {
    const proveedorId = parseInt(req.body.ProveedorId);
    const usuarioId = req.session.user?.id || 1;
    const detalleRaw = JSON.parse(req.body.DetalleJSON || '[]');

    const detalle = [];

    for (let item of detalleRaw) {
      const producto = await productosModel.obtenerProductoPorCodigo(item.Codigo);

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

    res.redirect('/inventario/compras');
  } catch (error) {
    console.error('❌ Error creando compra:', error);
    res.send('Error creando compra');
  }
});

// ================= CREAR =================
router.post('/crear', upload.single('Imagen'), async (req, res) => {
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

    // ✅ URL de Cloudinary (si subieron imagen)
    const imagenUrl = req.file ? req.file.path : null;

    // Mandamos todo al model + ImagenUrl
    await productosModel.insertarProducto({
      ...req.body,
      ImagenUrl: imagenUrl
    });

    res.redirect('/inventario');
  } catch (error) {
    console.error('❌ Error creando producto:', error);
    res.send('Error creando producto');
  }
});

// ================= ACTUALIZAR =================
router.post('/actualizar', upload.single('Imagen'), async (req, res) => {
  try {
    const imagenUrl = req.file ? req.file.path : null;

    await productosModel.actualizarProducto({
      ...req.body,
      ImagenUrl: imagenUrl
    });

    res.redirect('/inventario');
  } catch (error) {
    console.error('❌ Error actualizando producto:', error);
    res.send('Error actualizando producto');
  }
});

// ================= ELIMINAR =================
router.get('/eliminar/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!esIdNumerico(id)) {
      return res.status(400).send('ID inválido');
    }

    await productosModel.eliminarProducto(Number(id));
    res.redirect('/inventario');
  } catch (error) {
    console.error('❌ Error eliminando producto:', error);
    res.send('Error eliminando producto');
  }
});

// ================= OBTENER PRODUCTO (AJAX) =================

router.get('/producto-por-codigo/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;

    const producto = await productosModel.obtenerProductoPorCodigo(codigo);

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(producto);
  } catch (error) {
    console.error('❌ Error buscando producto por código:', error);
    res.status(500).json({ error: 'Error buscando producto' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!esIdNumerico(id)) {
      return res.status(404).json({ error: 'Ruta no válida' });
    }

    const producto = await productosModel.obtenerProductoPorId(Number(id));
    res.json(producto);
  } catch (error) {
    console.error('❌ Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error obteniendo producto' });
  }
});

function setVista(tipo) {

    const grid = document.getElementById("vistaGrid");
    const tabla = document.getElementById("vistaTabla");

    const botones = document.querySelectorAll(".btn-view");

    botones.forEach(b => b.classList.remove("active"));

    if (tipo === "grid") {
        grid.style.display = "grid";
        tabla.style.display = "none";
        botones[0].classList.add("active");
    } else {
        grid.style.display = "none";
        tabla.style.display = "block";
        botones[1].classList.add("active");
    }

    localStorage.setItem("inventarioVista", tipo);
}

module.exports = router;
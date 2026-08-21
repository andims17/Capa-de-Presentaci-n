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

/**
 * TC-028: vuelve a mostrar el inventario con un mensaje de error.
 *
 * Antes esto se armaba a mano en cada lugar y se olvidaba pasar
 * "proveedores", que la vista recorre con .forEach() -> EJS lanzaba
 * ReferenceError y el usuario veia un Internal Server Error en vez
 * del mensaje de validacion. Centralizarlo evita que vuelva a pasar.
 */
async function renderInventarioConError(res, mensaje) {
  const productos   = await productosModel.listarProductos();
  const resumen     = await productosModel.resumenInventario();
  const categorias  = await productosModel.listarCategorias();
  const proveedores = await require('../models/proveedoresModel').listarProveedores();

  return res.status(400).render('inventario/index', {
    title: 'Gestión de Inventario',
    productos,
    resumen,
    categorias,
    proveedores,
    error: mensaje
  });
}

/**
 * TC-028: valida duplicados por codigo (SKU) y por nombre.
 * Devuelve el mensaje de error, o null si no hay duplicado.
 */
async function validarProductoDuplicado({ codigo, nombre, excluirId = null }) {
  const codigoLimpio = String(codigo || '').trim();
  const nombreLimpio = String(nombre || '').trim();

  if (!nombreLimpio) return 'El nombre del producto es obligatorio';
  if (!codigoLimpio) return 'El código (SKU) del producto es obligatorio';

  if (await productosModel.existeCodigo(codigoLimpio, excluirId)) {
    return `Ya existe un producto con el código "${codigoLimpio}"`;
  }

  if (await productosModel.existeNombre(nombreLimpio, excluirId)) {
    return `Ya existe un producto llamado "${nombreLimpio}"`;
  }

  return null;
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
    // TC-028: se valida SKU y nombre antes de intentar guardar
    const errorDuplicado = await validarProductoDuplicado({
      codigo: req.body.Codigo,
      nombre: req.body.Nombre
    });

    if (errorDuplicado) {
      return await renderInventarioConError(res, errorDuplicado);
    }

    // ✅ URL de Cloudinary (si subieron imagen)
    const imagenUrl = req.file ? req.file.path : null;

    // Mandamos todo al model + ImagenUrl
    await productosModel.insertarProducto({
      ...req.body,
      Nombre: String(req.body.Nombre).trim(),
      Codigo: String(req.body.Codigo).trim(),
      ImagenUrl: imagenUrl
    });

    res.redirect('/inventario');
  } catch (error) {
    console.error('❌ Error creando producto:', error);
    // Red de seguridad: si la BD rechaza por el UNIQUE de Codigo,
    // igual se muestra un mensaje legible y no un 500 en blanco.
    if (error.code === 'ER_DUP_ENTRY') {
      return await renderInventarioConError(res, 'Ya existe un producto con ese código');
    }
    return await renderInventarioConError(res, 'Error creando el producto. Revisa los datos e intenta de nuevo.');
  }
});

// ================= ACTUALIZAR =================
router.post('/actualizar', upload.single('Imagen'), async (req, res) => {
  try {
    const id = Number(req.body.Id);

    // TC-028: la misma validacion al editar, excluyendo el propio
    // producto para que pueda guardarse sin cambiar el codigo.
    const errorDuplicado = await validarProductoDuplicado({
      codigo: req.body.Codigo,
      nombre: req.body.Nombre,
      excluirId: id
    });

    if (errorDuplicado) {
      return await renderInventarioConError(res, errorDuplicado);
    }

    const imagenUrl = req.file ? req.file.path : null;

    await productosModel.actualizarProducto({
      ...req.body,
      Nombre: String(req.body.Nombre).trim(),
      Codigo: String(req.body.Codigo).trim(),
      ImagenUrl: imagenUrl
    });

    res.redirect('/inventario');
  } catch (error) {
    console.error('❌ Error actualizando producto:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return await renderInventarioConError(res, 'Ya existe un producto con ese código');
    }
    return await renderInventarioConError(res, 'Error actualizando el producto. Revisa los datos e intenta de nuevo.');
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
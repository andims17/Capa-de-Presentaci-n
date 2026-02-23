const express = require('express');
const router = express.Router();
const path = require('path');

const productosModel = require(path.join(__dirname, '../models/productosModel'));

// Helper: validar id numérico (evita choque con "compras", etc.)
function esIdNumerico(id) {
  return /^\d+$/.test(String(id));
}

// ================= INVENTARIO (LISTA) =================
router.get('/', async (req, res) => {
  try {
    const productos = await productosModel.listarProductos();
    const resumen = await productosModel.resumenInventario();
    const categorias = await productosModel.listarCategorias();

    res.render('inventario/index', {
      title: 'Gestión de Inventario',
      productos,
      resumen,
      categorias
    });
  } catch (error) {
    console.error('❌ Error cargando inventario:', error);
    res.render('inventario/index', {
      title: 'Gestión de Inventario',
      productos: [],
      resumen: {},
      categorias: [],
      error: 'Error cargando inventario'
    });
  }
});

// ================= COMPRAS =================
router.get('/compras', (req, res) => {
  try {
    res.render('inventario/compras', {
      title: 'Registro de Compras'
    });
  } catch (error) {
    console.error('❌ Error cargando compras:', error);
    res.status(500).send('Error cargando compras');
  }
});

// ================= CREAR =================
router.post('/crear', async (req, res) => {
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

    await productosModel.insertarProducto(req.body);
    res.redirect('/inventario');
  } catch (error) {
    console.error('❌ Error creando producto:', error);
    res.send('Error creando producto');
  }
});

// ================= ACTUALIZAR =================
router.post('/actualizar', async (req, res) => {
  try {
    await productosModel.actualizarProducto(req.body);
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

module.exports = router;
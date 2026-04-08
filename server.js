require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== CONFIG =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// ===== MIDDLEWARES =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SESIONES
app.use(session({
  secret: process.env.SESSION_SECRET || 'vetpost_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 6 }
}));

// Variables globales para vistas
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.categorias = [];
  next();
});

// ===== ROUTERS =====
const inicioRouter  = require('./src/routes/inicio');
const citasRouter   = require('./src/routes/citas');
const clientesRouter = require('./src/routes/clientes');
const cuentaRouter  = require('./src/routes/cuenta');
const inventarioRouter = require('./src/routes/inventario');
const mascotaRouter = require('./src/routes/mascota');
const ventasRouter = require('./src/routes/ventas');
const reportesRouter = require('./src/routes/reportes');
const usuariosRouter = require('./src/routes/usuarios');
const proveedoresRouter = require('./src/routes/proveedores');
const transporteRouter = require('./src/routes/transporte');
const comprasRouter = require('./src/routes/compras');

const { requireLogin, requireAdmin } = require('./src/middlewares/auth');

// Home
app.get('/', (req, res) => {
  res.redirect('/cuenta/login');
});

// Cuenta (sin login)
app.use('/cuenta', cuentaRouter);

// Rutas para usuarios logueados
app.use('/inicio', requireLogin, inicioRouter);
app.use('/citas', requireLogin, citasRouter);
app.use('/clientes', requireLogin, clientesRouter);
app.use('/mascota', requireLogin, mascotaRouter);
app.use('/ventas', requireLogin, ventasRouter);
app.use('/transporte', requireLogin, transporteRouter);
app.use('/compras', requireLogin, comprasRouter);

// Solo admin
app.use('/usuarios', requireAdmin, usuariosRouter);
app.use('/proveedores', requireAdmin, proveedoresRouter);
app.use('/reportes', requireAdmin, reportesRouter);
app.use('/inventario', requireAdmin, inventarioRouter);

app.listen(PORT, () => {
  console.log(`✅ VetPost corriendo en http://localhost:${PORT}`);
});

require('dotenv').config(); // 👈 IMPORTANTE

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
  cookie: {
    maxAge: 1000 * 60 * 60 * 6 // 6 horas
  }
}));

app.use((req, res, next) => {
    res.locals.categorias = [];
    next();
});


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


app.get('/', (req, res) => {
  res.redirect('/cuenta/login');
});


app.use('/inicio', inicioRouter);
app.use('/citas', citasRouter);
app.use('/clientes', clientesRouter);
app.use('/cuenta', cuentaRouter);
app.use('/', inventarioRouter);
app.use('/mascota', mascotaRouter);
app.use('/ventas', ventasRouter);
app.use('/reportes', reportesRouter);
app.use('/usuarios', usuariosRouter);
app.use('/proveedores', proveedoresRouter);
app.use('/transporte', transporteRouter);


app.listen(PORT, () => {
  console.log(`✅ VetPost corriendo en http://localhost:${PORT}`);
});

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();
const PORT = process.env.PORT || 3000;

// Motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// RUTAS (controladores)
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


app.get('/', (req, res) => {
  res.redirect('/cuenta/login');
});

// Rutas de la app
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





// Iniciar servidor
app.listen(PORT, () => {
  console.log(`VetPost JS corriendo en http://localhost:${PORT}`);
});

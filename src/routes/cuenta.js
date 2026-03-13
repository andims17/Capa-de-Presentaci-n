const express = require('express');
const bcrypt = require('bcrypt');

const {
  findByUsername,
  existsUsername,
  existsEmail,
  createUser,
  getRoleIdByName
} = require('../models/usuarioModel');
const { registrarEvento } = require('../models/logAuditoriaModel');

const router = express.Router();

function obtenerIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || null;
}

async function registrarCierreSesion(req) {
  const usuario = req.session?.user;
  if (!usuario) return;

  await registrarEvento({
    codigoEvento: 'USR_LOGOUT',
    actorUsuarioId: usuario.id,
    usuarioAfectadoId: usuario.id,
    detalle: `Cierre de sesión: ${usuario.username}`,
    ip: obtenerIp(req),
    datos: { username: usuario.username, rol: usuario.rolNombre }
  });
}

// ===== LOGIN =====
router.get('/login', (req, res) => {
  res.render('cuenta/login', {
    title: 'Iniciar Sesión - VetPost',
    error: null,
    layout: false
  });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await findByUsername(username);

    if (!user || user.Activo === false) {
      return res.status(401).render('cuenta/login', {
        title: 'Iniciar Sesión - VetPost',
        error: 'Usuario o contraseña incorrectos',
        layout: false
      });
    }

    const valido = await bcrypt.compare(password, user.PasswordHash);
    if (!valido) {
      return res.status(401).render('cuenta/login', {
        title: 'Iniciar Sesión - VetPost',
        error: 'Usuario o contraseña incorrectos',
        layout: false
      });
    }

      req.session.user = {
    id: user.Id,
    username: user.Username,
    rolId: user.RolId,
    rolNombre: user.RolNombre
  };

    await registrarEvento({
      codigoEvento: 'USR_LOGIN',
      actorUsuarioId: user.Id,
      usuarioAfectadoId: user.Id,
      detalle: `Inicio de sesión: ${user.Username}`,
      ip: obtenerIp(req),
      datos: { username: user.Username, rol: user.RolNombre }
    });


    return res.redirect('/inicio');
  } catch (error) {
    console.error(error);
    return res.status(500).render('cuenta/login', {
      title: 'Iniciar Sesión - VetPost',
      error: 'Error al iniciar sesión',
      layout: false
    });
  }
});

// ===== REGISTRO =====
router.get('/registro', (req, res) => {
  res.render('cuenta/registro', {
    title: 'Crear Cuenta - VetPost',
    error: null,
    layout: false
  });
});

router.post('/registro', async (req, res) => {
  try {
    const { username, nombreCompleto, email, password, password2 } = req.body;

    if (!username || !nombreCompleto || !email || !password || !password2) {
      return res.status(400).render('cuenta/registro', {
        title: 'Crear Cuenta - VetPost',
        error: 'Por favor completa todos los campos.',
        layout: false
      });
    }

    if (password !== password2) {
      return res.status(400).render('cuenta/registro', {
        title: 'Crear Cuenta - VetPost',
        error: 'Las contraseñas no coinciden.',
        layout: false
      });
    }

    if (password.length < 6) {
      return res.status(400).render('cuenta/registro', {
        title: 'Crear Cuenta - VetPost',
        error: 'La contraseña debe tener al menos 6 caracteres.',
        layout: false
      });
    }

    if (await existsUsername(username)) {
      return res.status(400).render('cuenta/registro', {
        title: 'Crear Cuenta - VetPost',
        error: 'Ese usuario ya existe.',
        layout: false
      });
    }

    if (await existsEmail(email)) {
      return res.status(400).render('cuenta/registro', {
        title: 'Crear Cuenta - VetPost',
        error: 'Ese email ya está registrado.',
        layout: false
      });
    }

    const rolEmpleadoId = await getRoleIdByName('Empleado');
    if (!rolEmpleadoId) {
      return res.status(500).render('cuenta/registro', {
        title: 'Crear Cuenta - VetPost',
        error: 'No existe el rol "Empleado" en la base de datos.',
        layout: false
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newId = await createUser({
      username,
      nombreCompleto,
      email,
      passwordHash,
      rolId: rolEmpleadoId
    });

    await registrarEvento({
      codigoEvento: 'USR_REGISTRO_CUENTA',
      actorUsuarioId: newId,
      usuarioAfectadoId: newId,
      detalle: `Nuevo usuario registrado desde Crear Cuenta: ${username}`,
      ip: obtenerIp(req),
      datos: { username, rol: 'Empleado' }
    });

    // Auto-login al registrarse
    req.session.user = {
  id: newId,
  username,
  rolId: rolEmpleadoId,
  rolNombre: 'Empleado'
};

    await registrarEvento({
      codigoEvento: 'USR_LOGIN',
      actorUsuarioId: newId,
      usuarioAfectadoId: newId,
      detalle: `Inicio de sesión automático tras registro: ${username}`,
      ip: obtenerIp(req),
      datos: { username, rol: 'Empleado' }
    });



    return res.redirect('/inicio');
  } catch (err) {
    console.error(err);
    return res.status(500).render('cuenta/registro', {
      title: 'Crear Cuenta - VetPost',
      error: 'Error interno al crear la cuenta.',
      layout: false
    });
  }
});

// ===== LOGOUT =====
router.post('/logout', async (req, res) => {
  await registrarCierreSesion(req);
  req.session.destroy(() => {
    res.redirect('/cuenta/login');
  });
});

router.get('/logout', async (req, res) => {
  await registrarCierreSesion(req);
  req.session.destroy(() => {
    res.redirect('/cuenta/login');
  });
});


module.exports = router;

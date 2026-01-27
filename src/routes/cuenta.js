const express = require('express');
const bcrypt = require('bcrypt');

const {
  findByUsername,
  existsUsername,
  existsEmail,
  createUser,
  getRoleIdByName
} = require('../models/usuarioModel');

const router = express.Router();

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
      rol: user.RolId
    };

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

    // Auto-login al registrarse
    req.session.user = {
      id: newId,
      username,
      rol: rolEmpleadoId
    };

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
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/cuenta/login');
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/cuenta/login');
  });
});


module.exports = router;

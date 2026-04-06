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
const { getPool, sql } = require('../config/db');

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
    const { username, nombreCompleto, email, password, password2, respuesta1, respuesta2 } = req.body;

    if (!username || !nombreCompleto || !email || !password || !password2) {
      return res.status(400).render('cuenta/registro', {
        title: 'Crear Cuenta - VetPost',
        error: 'Por favor completa todos los campos.',
        layout: false
      });
    }

    if (!respuesta1 || !respuesta2) {
      return res.status(400).render('cuenta/registro', {
        title: 'Crear Cuenta - VetPost',
        error: 'Por favor responde las preguntas de seguridad.',
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
    const respuesta1Hash = respuesta1.toLowerCase().trim();
    const respuesta2Hash = respuesta2.toLowerCase().trim();

    const newId = await createUser({
      username,
      nombreCompleto,
      email,
      passwordHash,
      rolId: rolEmpleadoId,
      preguntaSeguridad1: 'Nombre de tu primera mascota',
      respuestaSeguridad1: respuesta1Hash,
      preguntaSeguridad2: 'Marca de tu primer auto',
      respuestaSeguridad2: respuesta2Hash
    });

    await registrarEvento({
      codigoEvento: 'USR_REGISTRO_CUENTA',
      actorUsuarioId: newId,
      usuarioAfectadoId: newId,
      detalle: `Nuevo usuario registrado: ${username}`,
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

// ===== OLVIDE CONTRASEÑA =====
router.get('/olvide-contrasena', (req, res) => {
  res.render('cuenta/olvide-contrasena', {
    title: 'Recuperar Contraseña - VetPost',
    error: null,
    layout: false
  });
});

router.post('/olvide-contrasena', async (req, res) => {
  const { username } = req.body;

  try {
    if (!username) {
      return res.status(400).render('cuenta/olvide-contrasena', {
        title: 'Recuperar Contraseña - VetPost',
        error: 'Por favor ingresa tu usuario.',
        layout: false
      });
    }

    const user = await findByUsername(username);
    if (!user) {
      // Mensaje genérico para no revelar usuarios existentes
      return res.status(400).render('cuenta/olvide-contrasena', {
        title: 'Recuperar Contraseña - VetPost',
        error: 'Si el usuario existe, se mostrarán las preguntas de seguridad.',
        layout: false
      });
    }

    // Guardar username en sesión para la siguiente paso
    req.session.usernameRecuperacion = username;

    // Redirigir a preguntas de seguridad
    return res.redirect('/cuenta/preguntas-seguridad');
  } catch (error) {
    console.error(error);
    return res.status(500).render('cuenta/olvide-contrasena', {
      title: 'Recuperar Contraseña - VetPost',
      error: 'Error al procesar tu solicitud.',
      layout: false
    });
  }
});

// ===== PREGUNTAS DE SEGURIDAD =====
router.get('/preguntas-seguridad', (req, res) => {
  if (!req.session.usernameRecuperacion) {
    return res.redirect('/cuenta/olvide-contrasena');
  }

  res.render('cuenta/preguntas-seguridad', {
    title: 'Preguntas de Seguridad - VetPost',
    username: req.session.usernameRecuperacion,
    error: null,
    layout: false
  });
});

router.post('/preguntas-seguridad', async (req, res) => {
  const { respuesta1, respuesta2 } = req.body;
  const username = req.session.usernameRecuperacion;

  try {
    if (!username) {
      return res.redirect('/cuenta/olvide-contrasena');
    }

    if (!respuesta1 || !respuesta2) {
      return res.status(400).render('cuenta/preguntas-seguridad', {
        title: 'Preguntas de Seguridad - VetPost',
        username,
        error: 'Por favor responde ambas preguntas de seguridad.',
        layout: false
      });
    }

    // Llamar SP para validar respuestas
    const pool = await getPool();
    const result = await pool.request()
      .input('Username', username)
      .input('Respuesta1', respuesta1)
      .input('Respuesta2', respuesta2)
      .output('Resultado', sql.Int)
      .execute('sp_Usuarios_ValidarRespuestasSeguridad');

    const resultado = result.output.Resultado;

    if (resultado === 1) {
      // Respuestas correctas
      req.session.respuestasValidadas = true;
      return res.redirect('/cuenta/nueva-contrasena');
    } else if (resultado === 3) {
      // Bloqueado temporalmente
      return res.status(429).render('cuenta/preguntas-seguridad', {
        title: 'Preguntas de Seguridad - VetPost',
        username,
        error: 'Demasiados intentos fallidos. Intenta nuevamente en 15 minutos.',
        layout: false
      });
    } else if (resultado === 2) {
      // Respuestas incorrectas
      return res.status(400).render('cuenta/preguntas-seguridad', {
        title: 'Preguntas de Seguridad - VetPost',
        username,
        error: 'Las respuestas son incorrectas. Por favor intenta nuevamente.',
        layout: false
      });
    } else {
      return res.status(400).render('cuenta/preguntas-seguridad', {
        title: 'Preguntas de Seguridad - VetPost',
        username,
        error: 'Usuario no encontrado o inactivo.',
        layout: false
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).render('cuenta/preguntas-seguridad', {
      title: 'Preguntas de Seguridad - VetPost',
      username,
      error: 'Error al validar respuestas.',
      layout: false
    });
  }
});

// ===== NUEVA CONTRASEÑA =====
router.get('/nueva-contrasena', (req, res) => {
  if (!req.session.respuestasValidadas || !req.session.usernameRecuperacion) {
    return res.redirect('/cuenta/olvide-contrasena');
  }

  res.render('cuenta/nueva-contrasena', {
    title: 'Nueva Contraseña - VetPost',
    error: null,
    layout: false
  });
});

router.post('/nueva-contrasena', async (req, res) => {
  const { password, password2 } = req.body;
  const username = req.session.usernameRecuperacion;

  try {
    if (!req.session.respuestasValidadas || !username) {
      return res.redirect('/cuenta/olvide-contrasena');
    }

    if (!password || !password2) {
      return res.status(400).render('cuenta/nueva-contrasena', {
        title: 'Nueva Contraseña - VetPost',
        error: 'Por favor completa ambos campos.',
        layout: false
      });
    }

    if (password !== password2) {
      return res.status(400).render('cuenta/nueva-contrasena', {
        title: 'Nueva Contraseña - VetPost',
        error: 'Las contraseñas no coinciden.',
        layout: false
      });
    }

    if (password.length < 6) {
      return res.status(400).render('cuenta/nueva-contrasena', {
        title: 'Nueva Contraseña - VetPost',
        error: 'La contraseña debe tener al menos 6 caracteres.',
        layout: false
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const pool = await getPool();
    const result = await pool.request()
      .input('Username', username)
      .input('NuevaContraseñaHash', passwordHash)
      .execute('sp_Usuarios_ResetearContraseña');

    if (result.recordsets[0][0]?.Exitoso) {
      // Limpiar sesión
      delete req.session.usernameRecuperacion;
      delete req.session.respuestasValidadas;

      return res.render('cuenta/exito-recuperacion', {
        title: 'Contraseña Actualizada - VetPost',
        layout: false
      });
    } else {
      return res.status(500).render('cuenta/nueva-contrasena', {
        title: 'Nueva Contraseña - VetPost',
        error: 'Error al actualizar la contraseña.',
        layout: false
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).render('cuenta/nueva-contrasena', {
      title: 'Nueva Contraseña - VetPost',
      error: 'Error al procesar tu solicitud.',
      layout: false
    });
  }
});


module.exports = router;

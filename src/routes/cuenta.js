const express = require('express');
const bcrypt = require('bcrypt');

const {
  findByUsername,
  existsUsername,
  existsEmail,
  createUser,
  getRoleIdByName,
  getDatosRecuperacion,
  registrarIntentoFallidoRecuperacion,
  resetearIntentosRecuperacion,
  guardarPreguntasSeguridad
} = require('../models/usuarioModel');
const { registrarEvento } = require('../models/logAuditoriaModel');
const { getPool } = require('../config/db');

const router = express.Router();

function obtenerIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || null;
}

// ===== RESPUESTAS DE SEGURIDAD =====
// Se normaliza ANTES de hashear para que la comparacion sea
// insensible a mayusculas y espacios. Si esta funcion cambia,
// las respuestas ya guardadas dejan de coincidir.
const SALT_ROUNDS_RESPUESTAS = 10;

function normalizarRespuesta(respuesta) {
  return String(respuesta).toLowerCase().trim();
}

function hashearRespuesta(respuesta) {
  return bcrypt.hash(normalizarRespuesta(respuesta), SALT_ROUNDS_RESPUESTAS);
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

    // Chequear si el usuario tiene preguntas de seguridad configuradas
    if (!user.PreguntasConfiguradas) {
      return res.redirect('/cuenta/configurar-preguntas');
    }

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

    // Las respuestas se guardan hasheadas, igual que la contrasena
    const respuesta1Hash = await hashearRespuesta(respuesta1);
    const respuesta2Hash = await hashearRespuesta(respuesta2);

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

  // Helper para no repetir el render en cada rama
  const responderError = (mensaje, status) =>
    res.status(status).render('cuenta/preguntas-seguridad', {
      title: 'Preguntas de Seguridad - VetPost',
      username,
      error: mensaje,
      layout: false
    });

  try {
    if (!username) {
      return res.redirect('/cuenta/olvide-contrasena');
    }

    if (!respuesta1 || !respuesta2) {
      return responderError('Por favor responde ambas preguntas de seguridad.', 400);
    }

    // Las respuestas estan hasheadas con bcrypt, asi que MySQL no puede
    // compararlas. El SP solo devuelve el hash guardado y el estado de
    // intentos; la verificacion se hace aca con bcrypt.compare().
    const datos = await getDatosRecuperacion(username);

    if (!datos || Number(datos.Activo) !== 1) {
      return responderError('Usuario no encontrado o inactivo.', 400);
    }

    if (!datos.RespuestaSeguridad1 || !datos.RespuestaSeguridad2) {
      return responderError('Esta cuenta no tiene preguntas de seguridad configuradas.', 400);
    }

    // ----- Bloqueo: 3 intentos fallidos, 15 minutos de espera -----
    const minutos = datos.MinutosDesdeUltimoIntento;
    const intentos = Number(datos.IntentosRecuperacion) || 0;

    if (intentos >= 3 && minutos !== null && minutos < 15) {
      return responderError('Demasiados intentos fallidos. Intenta nuevamente en 15 minutos.', 429);
    }

    // Ya paso el bloqueo: se limpia el contador y se deja intentar
    if (intentos >= 3) {
      await resetearIntentosRecuperacion(datos.Id);
    }

    // ----- Verificacion real -----
    // Se comparan las dos siempre (sin cortar en la primera) para no
    // filtrar por tiempo de respuesta cual de las dos fallo.
    const coincide1 = await bcrypt.compare(normalizarRespuesta(respuesta1), datos.RespuestaSeguridad1);
    const coincide2 = await bcrypt.compare(normalizarRespuesta(respuesta2), datos.RespuestaSeguridad2);

    if (coincide1 && coincide2) {
      await resetearIntentosRecuperacion(datos.Id);
      req.session.respuestasValidadas = true;
      return res.redirect('/cuenta/nueva-contrasena');
    }

    await registrarIntentoFallidoRecuperacion(datos.Id);

    await registrarEvento({
      codigoEvento: 'USR_RESET_PASSWORD',
      actorUsuarioId: null,
      usuarioAfectadoId: datos.Id,
      detalle: `Intento fallido de recuperacion para: ${username}`,
      ip: obtenerIp(req)
    });

    return responderError('Las respuestas son incorrectas. Por favor intenta nuevamente.', 400);
  } catch (error) {
    console.error(error);
    return responderError('Error al validar respuestas.', 500);
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

    // ===== NO PERMITIR REUTILIZAR LA CONTRASEÑA ACTUAL =====
    const usuarioActual = await findByUsername(username);

    if (!usuarioActual) {
      delete req.session.usernameRecuperacion;
      delete req.session.respuestasValidadas;
      return res.redirect('/cuenta/olvide-contrasena');
    }

    const esLaMismaContrasena = await bcrypt.compare(password, usuarioActual.PasswordHash);
    if (esLaMismaContrasena) {
      return res.status(400).render('cuenta/nueva-contrasena', {
        title: 'Nueva Contraseña - VetPost',
        error: 'La nueva contraseña no puede ser igual a la actual. Elige una diferente.',
        layout: false
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const pool = await getPool();
    const [rows] = await pool.execute(
      'CALL sp_Usuarios_ResetearContrasena(?, ?)',
      [username, passwordHash]
    );

    if (rows?.[0]?.[0]?.Exitoso) {
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

// ===== CONFIGURAR PREGUNTAS DE SEGURIDAD =====
router.get('/configurar-preguntas', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/cuenta/login');
  }

  res.render('cuenta/configurar-preguntas', {
    title: 'Configurar Preguntas de Seguridad - VetPost',
    error: null,
    layout: false
  });
});

router.post('/configurar-preguntas', async (req, res) => {
  const { respuesta1, respuesta2 } = req.body;
  const userId = req.session.user?.id;

  try {
    if (!userId) {
      return res.redirect('/cuenta/login');
    }

    if (!respuesta1 || !respuesta2) {
      return res.status(400).render('cuenta/configurar-preguntas', {
        title: 'Configurar Preguntas de Seguridad - VetPost',
        error: 'Por favor responde ambas preguntas.',
        layout: false
      });
    }

    if (respuesta1.length < 2 || respuesta2.length < 2) {
      return res.status(400).render('cuenta/configurar-preguntas', {
        title: 'Configurar Preguntas de Seguridad - VetPost',
        error: 'Las respuestas deben tener al menos 2 caracteres.',
        layout: false
      });
    }

    // Normalizar y hashear antes de guardar (nunca en texto plano)
    const respuesta1Hash = await hashearRespuesta(respuesta1);
    const respuesta2Hash = await hashearRespuesta(respuesta2);

    const guardado = await guardarPreguntasSeguridad({
      userId,
      respuestaHash1: respuesta1Hash,
      respuestaHash2: respuesta2Hash
    });

    if (guardado) {
      // Actualizar sesión para marcar que está configurado
      req.session.user.preguntasConfiguradas = true;

      // Registrar evento
      await registrarEvento({
        codigoEvento: 'USR_CONFIG_SEGURIDAD',
        actorUsuarioId: userId,
        usuarioAfectadoId: userId,
        detalle: `Usuario configuró preguntas de seguridad`,
        ip: obtenerIp(req),
        datos: { username: req.session.user.username }
      });

      return res.render('cuenta/exito-configuracion', {
        title: 'Configuración Completada - VetPost',
        layout: false
      });
    } else {
      return res.status(500).render('cuenta/configurar-preguntas', {
        title: 'Configurar Preguntas de Seguridad - VetPost',
        error: 'Error al guardar las preguntas. Intenta nuevamente.',
        layout: false
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).render('cuenta/configurar-preguntas', {
      title: 'Configurar Preguntas de Seguridad - VetPost',
      error: 'Error al procesar tu solicitud.',
      layout: false
    });
  }
});


module.exports = router;
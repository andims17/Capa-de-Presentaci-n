const express = require('express');
const bcrypt = require('bcrypt');

const {
  getAllUsers,
  getUserById,
  getRoles,
  existsUsername,
  existsEmail,
  createUser,
  updateUser,
  resetPassword,   // ✅ 1) AGREGADO
  setUserActive
} = require('../models/usuarioModel');
const { registrarEvento } = require('../models/logAuditoriaModel');

const router = express.Router();

function obtenerIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || null;
}

function nombreRolPorId(roles, rolId) {
  const rol = roles.find(r => r.Id === parseInt(rolId, 10));
  return rol ? rol.Nombre : String(rolId);
}

// LISTA
router.get('/', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.render('usuarios/index', { title: 'Usuarios', users });
  } catch (e) {
    console.error(e);
    res.status(500).send('Error cargando usuarios');
  }
});

// FORM CREAR
router.get('/nuevo', async (req, res) => {
  const roles = await getRoles();
  res.render('usuarios/nuevo', { title: 'Crear Usuario', roles, error: null, form: {} });
});

// CREAR
router.post('/nuevo', async (req, res) => {
  try {
    const { username, nombreCompleto, email, password, rolId } = req.body;
    const roles = await getRoles();

    if (!username || !nombreCompleto || !email || !password || !rolId) {
      return res.render('usuarios/nuevo', { title: 'Crear Usuario', roles, error: 'Completa todos los campos.', form: req.body });
    }

    if (await existsUsername(username)) {
      return res.render('usuarios/nuevo', { title: 'Crear Usuario', roles, error: 'Ese username ya existe.', form: req.body });
    }

    if (await existsEmail(email)) {
      return res.render('usuarios/nuevo', { title: 'Crear Usuario', roles, error: 'Ese email ya está registrado.', form: req.body });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await createUser({
      username,
      nombreCompleto,
      email,
      passwordHash,
      rolId: parseInt(rolId, 10)
    });

    const rolNombre = nombreRolPorId(roles, rolId);
    registrarEvento({
      codigoEvento: rolNombre === 'Administrador' ? 'USR_ALTA_ADMIN' : 'USR_ALTA_EMPLEADO',
      actorUsuarioId: req.session.user?.id ?? null,
      detalle: `Usuario creado: ${username} (${rolNombre})`,
      ip: obtenerIp(req)
    });

    return res.redirect('/usuarios');
  } catch (e) {
    console.error(e);
    res.status(500).send('Error creando usuario');
  }
});

// FORM EDITAR
router.get('/:id/editar', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await getUserById(id);
    const roles = await getRoles();

    if (!user) return res.status(404).send('Usuario no encontrado');

    res.render('usuarios/editar', { title: 'Editar Usuario', user, roles, error: null });
  } catch (e) {
    console.error(e);
    res.status(500).send('Error abriendo edición');
  }
});

// EDITAR (incluye reset password opcional) ✅ 2) MODIFICADO
router.post('/:id/editar', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { username, nombreCompleto, email, rolId, activo, newPassword } = req.body;

    const user = await getUserById(id);
    const roles = await getRoles();
    if (!user) return res.status(404).send('Usuario no encontrado');

    // Validaciones mínimas
    if (!username || !nombreCompleto || !email || !rolId) {
      return res.render('usuarios/editar', {
        title: 'Editar Usuario',
        user: { ...user, ...req.body },
        roles,
        error: 'Completa todos los campos obligatorios.'
      });
    }

    if (username !== user.Username && await existsUsername(username)) {
      return res.render('usuarios/editar', {
        title: 'Editar Usuario',
        user: { ...user, ...req.body },
        roles,
        error: 'Ese username ya existe.'
      });
    }

    if (email !== user.Email && await existsEmail(email)) {
      return res.render('usuarios/editar', {
        title: 'Editar Usuario',
        user: { ...user, ...req.body },
        roles,
        error: 'Ese email ya está registrado.'
      });
    }

    const activoBool = (activo === '1' || activo === 1 || activo === true || activo === 'true');

    // ✅ Update normal (sin password)
    await updateUser({
      id,
      username,
      nombreCompleto,
      email,
      rolId: parseInt(rolId, 10),
      activo: activoBool
    });

    registrarEvento({
      codigoEvento: 'USR_EDITADO',
      actorUsuarioId: req.session.user?.id ?? null,
      usuarioAfectadoId: id,
      detalle: `Usuario editado: ${username} (ID ${id})`,
      ip: obtenerIp(req)
    });

    if (parseInt(rolId, 10) !== user.RolId) {
      const roles2 = await getRoles();
      registrarEvento({
        codigoEvento: 'USR_CAMBIO_ROL',
        actorUsuarioId: req.session.user?.id ?? null,
        usuarioAfectadoId: id,
        detalle: `Cambio de rol → ${nombreRolPorId(roles2, rolId)}`,
        ip: obtenerIp(req)
      });
    }

    // ✅ Reset password opcional en SP aparte
    if (newPassword && newPassword.trim().length >= 6) {
      const passwordHash = await bcrypt.hash(newPassword.trim(), 10);
      await resetPassword({ id, passwordHash });
      registrarEvento({
        codigoEvento: 'USR_RESET_PASSWORD',
        actorUsuarioId: req.session.user?.id ?? null,
        usuarioAfectadoId: id,
        detalle: `Reset de contraseña para usuario ID ${id}`,
        ip: obtenerIp(req)
      });
    }

    return res.redirect('/usuarios');
  } catch (e) {
    console.error(e);
    res.status(500).send('Error actualizando usuario');
  }
});

// DESACTIVAR
router.post('/:id/desactivar', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await setUserActive(id, 0);
  registrarEvento({
    codigoEvento: 'USR_DESACTIVADO',
    actorUsuarioId: req.session.user?.id ?? null,
    usuarioAfectadoId: id,
    detalle: `Usuario desactivado (ID ${id})`,
    ip: obtenerIp(req)
  });
  res.redirect('/usuarios');
});

// ACTIVAR
router.post('/:id/activar', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await setUserActive(id, 1);
  registrarEvento({
    codigoEvento: 'USR_ACTIVADO',
    actorUsuarioId: req.session.user?.id ?? null,
    usuarioAfectadoId: id,
    detalle: `Usuario activado (ID ${id})`,
    ip: obtenerIp(req)
  });
  res.redirect('/usuarios');
});

module.exports = router;

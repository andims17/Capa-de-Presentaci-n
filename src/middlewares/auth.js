const { getUserById } = require('../models/usuarioModel');

/**
 * Cada cuanto se vuelve a consultar la BD para confirmar que la cuenta
 * sigue activa. Sin esto habria una consulta por cada peticion.
 * 30 segundos: suficientemente rapido para que desactivar a alguien
 * lo saque casi de inmediato, sin castigar el rendimiento.
 */
const SEGUNDOS_REVALIDACION = 30;

/**
 * Vuelve a leer el usuario de la BD y actualiza la sesion.
 *
 * Motivo: la sesion se arma una sola vez al iniciar sesion. Si despues
 * un admin desactiva la cuenta o le cambia el rol, la sesion vieja
 * seguia funcionando hasta que la persona cerrara sesion o expirara
 * la cookie (6 horas). Desactivar a alguien no lo sacaba del sistema.
 *
 * Devuelve:
 *   'ok'        -> la cuenta sigue activa (sesion actualizada)
 *   'inactiva'  -> la cuenta fue desactivada o eliminada
 *   'error'     -> no se pudo consultar la BD
 */
async function revalidarSesion(req) {
  const sesion = req.session.user;
  if (!sesion) return 'inactiva';

  const ahora = Date.now();
  const ultima = sesion.revalidadoEn || 0;

  if (ahora - ultima < SEGUNDOS_REVALIDACION * 1000) {
    return 'ok';
  }

  let usuario;
  try {
    usuario = await getUserById(sesion.id);
  } catch (error) {
    console.error('Error revalidando sesión:', error);
    // Si la BD falla no se expulsa a nadie: se reintenta en la
    // siguiente peticion. Cortar el acceso por un problema de red
    // seria peor que esperar unos segundos.
    return 'error';
  }

  // Usuario borrado, o Activo en 0.
  // Ojo con la comparacion: MySQL devuelve TINYINT(1) como numero,
  // asi que "=== false" nunca da true. Por eso Number(...) !== 1.
  if (!usuario || Number(usuario.Activo) !== 1) {
    return 'inactiva';
  }

  // Refrescar rol y nombre por si cambiaron mientras la sesion estaba abierta
  req.session.user = {
    ...sesion,
    username: usuario.Username,
    rolId: usuario.RolId,
    rolNombre: usuario.RolNombre,
    revalidadoEn: ahora
  };

  return 'ok';
}

function cerrarSesionPorInactiva(req, res) {
  req.session.destroy(() => {
    res.redirect('/cuenta/login?motivo=cuenta_inactiva');
  });
}

async function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/cuenta/login');

  const estado = await revalidarSesion(req);
  if (estado === 'inactiva') return cerrarSesionPorInactiva(req, res);

  next();
}

async function requireAdmin(req, res, next) {
  if (!req.session.user) return res.redirect('/cuenta/login');

  const estado = await revalidarSesion(req);
  if (estado === 'inactiva') return cerrarSesionPorInactiva(req, res);

  // Se lee despues de revalidar: si le quitaron el rol de admin
  // mientras tenia la sesion abierta, aca ya esta actualizado.
  if (req.session.user.rolNombre !== 'Administrador') {
    return res.status(403).render('errors/403', { layout: false });
  }

  next();
}

module.exports = { requireLogin, requireAdmin, revalidarSesion };

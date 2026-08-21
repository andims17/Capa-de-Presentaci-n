const { pool } = require('../config/db');

// ===== LOGIN =====
async function findByUsername(username) {
  const [rows] = await pool.execute('CALL sp_Usuarios_ObtenerPorUsername(?)', [username]);
  return rows[0][0];
}

// ===== REGISTRO / ADMIN CREATE =====
async function createUser({ username, nombreCompleto, email, passwordHash, rolId, preguntaSeguridad1, respuestaSeguridad1, preguntaSeguridad2, respuestaSeguridad2 }) {
  const [rows] = await pool.execute('CALL sp_Usuarios_Insertar(?,?,?,?,?,?,?,?,?)', [
    username, nombreCompleto, email, passwordHash, rolId,
    preguntaSeguridad1 || null, respuestaSeguridad1 || null,
    preguntaSeguridad2 || null, respuestaSeguridad2 || null
  ]);
  return rows[0][0]?.Id;
}

// ===== VALIDACIONES =====
async function existsUsername(username) {
  const [rows] = await pool.execute('CALL sp_Usuarios_ExisteUsername(?)', [username]);
  return (rows[0][0]?.Existe ?? 0) === 1;
}

async function existsEmail(email) {
  const [rows] = await pool.execute('CALL sp_Usuarios_ExisteEmail(?)', [email]);
  return (rows[0][0]?.Existe ?? 0) === 1;
}

// ===== ROLES =====
async function getRoleIdByName(nombreRol) {
  const [rows] = await pool.execute('CALL sp_Roles_ObtenerIdPorNombre(?)', [nombreRol]);
  return rows[0][0]?.Id || null;
}

async function getRoles() {
  const [rows] = await pool.execute('CALL sp_Roles_Listar()');
  return rows[0];
}

// ===== CRUD ADMIN =====
async function getAllUsers() {
  const [rows] = await pool.execute('CALL sp_Usuarios_Listar()');
  return rows[0];
}

async function getUserById(id) {
  const [rows] = await pool.execute('CALL sp_Usuarios_ObtenerPorId(?)', [id]);
  return rows[0][0];
}

async function updateUser({ id, username, nombreCompleto, email, rolId, activo }) {
  await pool.execute('CALL sp_Usuarios_Actualizar(?,?,?,?,?,?)', [
    id, username, nombreCompleto, email, rolId, activo ? 1 : 0
  ]);
}

async function resetPassword({ id, passwordHash }) {
  await pool.execute('CALL sp_Usuarios_ResetPassword(?,?)', [id, passwordHash]);
}

async function setUserActive(id, activo) {
  await pool.execute('CALL sp_Usuarios_SetActivo(?,?)', [id, activo ? 1 : 0]);
}

// ===== PREGUNTAS DE SEGURIDAD (respuestas con hash bcrypt) =====
// La comparacion NO se hace en MySQL: bcrypt solo existe en Node.
// Estos SPs unicamente leen el hash guardado y llevan el contador
// de intentos fallidos.

async function getDatosRecuperacion(username) {
  const [rows] = await pool.execute('CALL sp_Usuarios_ObtenerDatosRecuperacion(?)', [username]);
  return rows[0][0];
}

async function registrarIntentoFallidoRecuperacion(userId) {
  await pool.execute('CALL sp_Usuarios_RegistrarIntentoFallido(?)', [userId]);
}

async function resetearIntentosRecuperacion(userId) {
  await pool.execute('CALL sp_Usuarios_ResetearIntentosRecuperacion(?)', [userId]);
}

async function guardarPreguntasSeguridad({ userId, respuestaHash1, respuestaHash2 }) {
  const [rows] = await pool.execute(
    'CALL sp_Usuarios_GuardarPreguntasSeguridad(?,?,?)',
    [userId, respuestaHash1, respuestaHash2]
  );
  return (rows[0][0]?.Exitoso ?? 0) === 1;
}

module.exports = {
  findByUsername,
  createUser,
  existsUsername,
  existsEmail,
  getRoleIdByName,
  getRoles,
  getAllUsers,
  getUserById,
  updateUser,
  resetPassword,
  setUserActive,
  getDatosRecuperacion,
  registrarIntentoFallidoRecuperacion,
  resetearIntentosRecuperacion,
  guardarPreguntasSeguridad
};

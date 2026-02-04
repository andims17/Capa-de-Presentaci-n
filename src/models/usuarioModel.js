const { getPool, sql } = require('../config/db');

// ===== LOGIN =====
async function findByUsername(username) {
  const pool = await getPool();

  const result = await pool.request()
    .input('Username', sql.NVarChar(50), username)
    .execute('dbo.sp_Usuarios_ObtenerPorUsername');

  return result.recordset[0];
}

// ===== REGISTRO / ADMIN CREATE =====
async function createUser({ username, nombreCompleto, email, passwordHash, rolId }) {
  const pool = await getPool();

  const result = await pool.request()
    .input('Username', sql.NVarChar(50), username)
    .input('NombreCompleto', sql.NVarChar(120), nombreCompleto)
    .input('Email', sql.NVarChar(120), email)
    .input('PasswordHash', sql.NVarChar(255), passwordHash)
    .input('RolId', sql.Int, rolId)
    .execute('dbo.sp_Usuarios_Insertar');

  return result.recordset[0]?.Id;
}

// ===== VALIDACIONES =====
async function existsUsername(username) {
  const pool = await getPool();

  const r = await pool.request()
    .input('Username', sql.NVarChar(50), username)
    .execute('dbo.sp_Usuarios_ExisteUsername');

  return (r.recordset[0]?.Existe ?? 0) === 1;
}

async function existsEmail(email) {
  const pool = await getPool();

  const r = await pool.request()
    .input('Email', sql.NVarChar(120), email)
    .execute('dbo.sp_Usuarios_ExisteEmail');

  return (r.recordset[0]?.Existe ?? 0) === 1;
}

// ===== ROLES =====
async function getRoleIdByName(nombreRol) {
  const pool = await getPool();

  const r = await pool.request()
    .input('Nombre', sql.NVarChar(50), nombreRol)
    .execute('dbo.sp_Roles_ObtenerIdPorNombre');

  return r.recordset[0]?.Id || null;
}

async function getRoles() {
  const pool = await getPool();
  const r = await pool.request().execute('dbo.sp_Roles_Listar');
  return r.recordset;
}

// ===== CRUD ADMIN =====
async function getAllUsers() {
  const pool = await getPool();
  const r = await pool.request().execute('dbo.sp_Usuarios_Listar');
  return r.recordset;
}

async function getUserById(id) {
  const pool = await getPool();
  const r = await pool.request()
    .input('Id', sql.Int, id)
    .execute('dbo.sp_Usuarios_ObtenerPorId');

  return r.recordset[0];
}

async function updateUser({ id, username, nombreCompleto, email, rolId, activo }) {
  const pool = await getPool();

  await pool.request()
    .input('Id', sql.Int, id)
    .input('Username', sql.NVarChar(50), username)
    .input('NombreCompleto', sql.NVarChar(120), nombreCompleto)
    .input('Email', sql.NVarChar(120), email)
    .input('RolId', sql.Int, rolId)
    .input('Activo', sql.Bit, activo ? 1 : 0)
    .execute('dbo.sp_Usuarios_Actualizar');
}

async function resetPassword({ id, passwordHash }) {
  const pool = await getPool();

  await pool.request()
    .input('Id', sql.Int, id)
    .input('PasswordHash', sql.NVarChar(255), passwordHash)
    .execute('dbo.sp_Usuarios_ResetPassword');
}

async function setUserActive(id, activo) {
  const pool = await getPool();

  await pool.request()
    .input('Id', sql.Int, id)
    .input('Activo', sql.Bit, activo ? 1 : 0)
    .execute('dbo.sp_Usuarios_SetActivo');
}

module.exports = {
  findByUsername,
  createUser,
  existsUsername,
  existsEmail,
  getRoleIdByName,
  // admin
  getRoles,
  getAllUsers,
  getUserById,
  updateUser,
  resetPassword,
  setUserActive
};

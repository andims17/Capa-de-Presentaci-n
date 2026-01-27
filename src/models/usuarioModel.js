const { getPool, sql } = require('../config/db');

async function findByUsername(username) {
  const pool = await getPool();

  const result = await pool.request()
    .input('username', sql.VarChar(50), username)
    .query(`
      SELECT u.Id, u.Username, u.NombreCompleto, u.Email, u.PasswordHash, u.RolId, u.Activo
      FROM Usuarios u
      WHERE u.Username = @username
    `);

  return result.recordset[0];
}

async function createUser({ username, nombreCompleto, email, passwordHash, rolId }) {
  const pool = await getPool();

  const result = await pool.request()
    .input('username', sql.VarChar(50), username)
    .input('nombreCompleto', sql.VarChar(120), nombreCompleto)
    .input('email', sql.VarChar(120), email)
    .input('passwordHash', sql.VarChar(255), passwordHash)
    .input('rolId', sql.Int, rolId)
    .query(`
      INSERT INTO Usuarios (Username, NombreCompleto, Email, PasswordHash, RolId, Activo)
      OUTPUT INSERTED.Id
      VALUES (@username, @nombreCompleto, @email, @passwordHash, @rolId, 1)
    `);

  return result.recordset[0]?.Id;
}

async function existsUsername(username) {
  const pool = await getPool();
  const r = await pool.request()
    .input('username', sql.VarChar(50), username)
    .query(`SELECT 1 AS ok FROM Usuarios WHERE Username = @username`);
  return r.recordset.length > 0;
}

async function existsEmail(email) {
  const pool = await getPool();
  const r = await pool.request()
    .input('email', sql.VarChar(120), email)
    .query(`SELECT 1 AS ok FROM Usuarios WHERE Email = @email`);
  return r.recordset.length > 0;
}

async function getRoleIdByName(nombreRol) {
  const pool = await getPool();
  const r = await pool.request()
    .input('nombre', sql.VarChar(50), nombreRol)
    .query(`SELECT TOP 1 Id FROM Roles WHERE Nombre = @nombre`);
  return r.recordset[0]?.Id || null;
}

module.exports = {
  findByUsername,
  createUser,
  existsUsername,
  existsEmail,
  getRoleIdByName
};

const { getPool } = require('./src/config/db');

function timeout(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout (${ms}ms) conectando a SQL`)), ms)
  );
}

(async () => {
  try {
    const pool = await Promise.race([getPool(), timeout(7000)]);
    const r = await pool.request().query('SELECT TOP 1 Username FROM Usuarios');
    console.log('✅ OK:', r.recordset[0]);
    process.exit(0);
  } catch (e) {
    console.error('❌ ERROR:', e.message);
    process.exit(1);
  }
})();

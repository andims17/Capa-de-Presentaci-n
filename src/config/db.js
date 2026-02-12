
const sql = require('mssql/msnodesqlv8');

const config = {
  connectionString: `
    Driver={ODBC Driver 17 for SQL Server};
    Server=localhost;
    Database=VetPostDB;
    Trusted_Connection=Yes;
    TrustServerCertificate=Yes;
  `
};

let pool;

async function getPool() {
  if (pool) return pool;
  console.log('Conectando a SQL Server (Windows Auth, Driver 17)...');
  pool = await sql.connect(config);
  console.log('✅ SQL Server conectado');
  return pool;
}

module.exports = { sql, getPool };



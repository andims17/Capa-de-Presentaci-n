const sql = require('mssql/msnodesqlv8');

const config = {
  server: 'DESKTOP-RG1QD46',
  database: 'VetPostDB',
  driver: 'msnodesqlv8',
  options: {
    trustedConnection: true,
    trustServerCertificate: true
  },
  connectionTimeout: 10000,
  requestTimeout: 10000
};

let pool;

async function getPool() {
  if (pool) return pool;
  console.log('Conectando a SQL Server (Windows Auth)...');
  pool = await sql.connect(config);
  console.log('Conectado a SQL Server');
  return pool;
}

module.exports = { sql, getPool };



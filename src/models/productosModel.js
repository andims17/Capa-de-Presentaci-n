const { sql, getPool } = require('../config/db');

async function obtenerProductos() {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT p.Id, p.Nombre, p.Codigo, p.Precio, p.Stock, p.StockMinimo,
                   c.Nombre AS Categoria
            FROM Productos p
            INNER JOIN Categorias c ON p.CategoriaId = c.Id
        `);
        return result.recordset;
    } catch (err) {
        console.error(err);
        return [];
    }
}
module.exports = {
  obtenerProductos
};

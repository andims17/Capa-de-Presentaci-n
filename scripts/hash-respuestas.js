/**
 * MIGRACION UNICA: convierte a bcrypt las respuestas de seguridad
 * que hoy estan guardadas en texto plano.
 *
 * Uso:
 *   node scripts/hash-respuestas.js            -> muestra que haria (NO escribe)
 *   node scripts/hash-respuestas.js --aplicar  -> escribe los cambios
 *
 * Es seguro correrlo varias veces: si una respuesta ya es un hash
 * bcrypt la deja igual. Las cuentas de prueba conservan sus mismas
 * respuestas, solo cambia la forma en que estan guardadas.
 *
 * IMPORTANTE: correr migracion_respuestas_hash.sql ANTES que esto.
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/db');

const SALT_ROUNDS = 10;
const APLICAR = process.argv.includes('--aplicar');

// Un hash bcrypt siempre arranca con $2a$, $2b$ o $2y$
function yaEstaHasheada(valor) {
  return typeof valor === 'string' && /^\$2[aby]\$/.test(valor);
}

// MISMA normalizacion que usa la app al validar.
// Si esto cambia, las respuestas viejas dejan de coincidir.
function normalizar(respuesta) {
  return String(respuesta).toLowerCase().trim();
}

/**
 * Ubica en que esquema vive realmente la tabla Usuarios.
 * En Railway la base por defecto se llama 'railway', pero el script
 * original creaba 'VetPostDB'. Segun como se haya importado, la tabla
 * puede estar en cualquiera de las dos.
 */
async function resolverEsquemaUsuarios() {
  const [filas] = await pool.query(
    `SELECT TABLE_SCHEMA
     FROM information_schema.TABLES
     WHERE TABLE_NAME = 'Usuarios'
       AND TABLE_SCHEMA NOT IN ('information_schema','performance_schema','mysql','sys')
     ORDER BY (TABLE_SCHEMA = DATABASE()) DESC`
  );

  if (filas.length === 0) {
    throw new Error(
      'No se encontro ninguna tabla "Usuarios" en este servidor.\n' +
      '   Corre primero: node scripts/diagnostico-bd.js'
    );
  }

  if (filas.length > 1) {
    console.log('AVISO: hay tabla "Usuarios" en varios esquemas:');
    filas.forEach(f => console.log(`   - ${f.TABLE_SCHEMA}`));
    console.log(`   Se usara: ${filas[0].TABLE_SCHEMA}\n`);
  }

  return filas[0].TABLE_SCHEMA;
}

(async () => {
  let procesados = 0;
  let convertidos = 0;
  let intactos = 0;

  try {
    const esquema = await resolverEsquemaUsuarios();
    const tabla = `\`${esquema}\`.\`Usuarios\``;
    console.log(`Tabla objetivo: ${esquema}.Usuarios\n`);

    const [usuarios] = await pool.query(
      `SELECT Id, Username, RespuestaSeguridad1, RespuestaSeguridad2
       FROM ${tabla}
       WHERE (RespuestaSeguridad1 IS NOT NULL AND RespuestaSeguridad1 <> '')
          OR (RespuestaSeguridad2 IS NOT NULL AND RespuestaSeguridad2 <> '')
       ORDER BY Id`
    );

    if (usuarios.length === 0) {
      console.log('No hay usuarios con respuestas de seguridad guardadas.');
      return;
    }

    console.log(APLICAR
      ? `Aplicando cambios sobre ${usuarios.length} usuario(s)...\n`
      : `SIMULACION (no se escribe nada). ${usuarios.length} usuario(s):\n`);

    for (const u of usuarios) {
      procesados++;

      const r1Plana = u.RespuestaSeguridad1;
      const r2Plana = u.RespuestaSeguridad2;

      const necesita1 = r1Plana && !yaEstaHasheada(r1Plana);
      const necesita2 = r2Plana && !yaEstaHasheada(r2Plana);

      if (!necesita1 && !necesita2) {
        intactos++;
        console.log(`  [=] ${u.Username} (ID ${u.Id}) - ya estaba hasheada`);
        continue;
      }

      const nuevoR1 = necesita1
        ? await bcrypt.hash(normalizar(r1Plana), SALT_ROUNDS)
        : r1Plana;

      const nuevoR2 = necesita2
        ? await bcrypt.hash(normalizar(r2Plana), SALT_ROUNDS)
        : r2Plana;

      if (APLICAR) {
        await pool.execute(
          `UPDATE ${tabla} SET RespuestaSeguridad1 = ?, RespuestaSeguridad2 = ? WHERE Id = ?`,
          [nuevoR1, nuevoR2, u.Id]
        );
      }

      convertidos++;
      console.log(`  [${APLICAR ? 'OK' : '->'}] ${u.Username} (ID ${u.Id}) - convertida a bcrypt`);
    }

    console.log(`\nRevisados: ${procesados} | Convertidos: ${convertidos} | Ya hasheados: ${intactos}`);

    if (!APLICAR && convertidos > 0) {
      console.log('\nNada se guardo. Para aplicar de verdad:');
      console.log('   node scripts/hash-respuestas.js --aplicar');
    }
  } catch (error) {
    console.error('\nError durante la migracion:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

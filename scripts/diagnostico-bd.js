/**
 * DIAGNOSTICO: ubica en que base de datos estan realmente las
 * tablas y los stored procedures.
 *
 * No modifica nada. Solo lee y reporta.
 *
 * Uso (desde la raiz del proyecto):
 *   node scripts/diagnostico-bd.js
 */

require('dotenv').config();
const { pool } = require('../src/config/db');

function linea(titulo) {
  console.log('\n' + '='.repeat(60));
  console.log(titulo);
  console.log('='.repeat(60));
}

(async () => {
  try {
    // ---- 1. A que base esta conectada la app ----
    linea('1. CONEXION ACTUAL');
    const [[actual]] = await pool.query('SELECT DATABASE() AS BaseActual, VERSION() AS Version');
    console.log(`   .env DB_NAME     : ${process.env.DB_NAME}`);
    console.log(`   Base en uso      : ${actual.BaseActual}`);
    console.log(`   Version MySQL    : ${actual.Version}`);

    const [[lctn]] = await pool.query("SHOW VARIABLES LIKE 'lower_case_table_names'");
    console.log(`   lower_case_table_names: ${lctn ? lctn.Value : '?'}  (0 = distingue mayusculas)`);

    // ---- 2. Bases disponibles ----
    linea('2. BASES DE DATOS VISIBLES');
    const [bases] = await pool.query('SHOW DATABASES');
    const nombres = bases
      .map(b => Object.values(b)[0])
      .filter(n => !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(n));
    nombres.forEach(n => console.log(`   - ${n}`));

    // ---- 3. Donde esta la tabla Usuarios ----
    linea('3. TABLA "Usuarios" - EN QUE ESQUEMA VIVE');
    const [tablas] = await pool.query(
      `SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_ROWS
       FROM information_schema.TABLES
       WHERE TABLE_NAME LIKE '%suario%'
       ORDER BY TABLE_SCHEMA`
    );

    if (tablas.length === 0) {
      console.log('   NO se encontro ninguna tabla parecida a "Usuarios".');
      console.log('   Puede que el usuario de conexion no tenga permiso de verla.');
    } else {
      tablas.forEach(t => {
        console.log(`   ${t.TABLE_SCHEMA}.${t.TABLE_NAME}  (~${t.TABLE_ROWS} filas)`);
      });
    }

    // ---- 4. Donde estan los SPs ----
    linea('4. STORED PROCEDURES DE USUARIOS');
    const [sps] = await pool.query(
      `SELECT ROUTINE_SCHEMA, ROUTINE_NAME
       FROM information_schema.ROUTINES
       WHERE ROUTINE_NAME LIKE 'sp_Usuarios%'
       ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME`
    );

    if (sps.length === 0) {
      console.log('   NO se encontro ningun sp_Usuarios*.');
    } else {
      let esquemaPrevio = null;
      sps.forEach(sp => {
        if (sp.ROUTINE_SCHEMA !== esquemaPrevio) {
          console.log(`\n   [${sp.ROUTINE_SCHEMA}]`);
          esquemaPrevio = sp.ROUTINE_SCHEMA;
        }
        console.log(`     - ${sp.ROUTINE_NAME}`);
      });
    }

    // ---- 5. Verificar los SPs nuevos de la migracion ----
    linea('5. SPs NUEVOS (los del script de migracion)');
    const esperados = [
      'sp_Usuarios_ObtenerDatosRecuperacion',
      'sp_Usuarios_RegistrarIntentoFallido',
      'sp_Usuarios_ResetearIntentosRecuperacion',
      'sp_Usuarios_GuardarPreguntasSeguridad',
      'sp_Usuarios_EstadoHashRespuestas'
    ];

    for (const nombre of esperados) {
      const encontrado = sps.filter(sp => sp.ROUTINE_NAME === nombre);
      if (encontrado.length === 0) {
        console.log(`   [FALTA] ${nombre}`);
      } else {
        console.log(`   [OK]    ${nombre}  -> ${encontrado.map(e => e.ROUTINE_SCHEMA).join(', ')}`);
      }
    }

    const viejo = sps.find(sp => sp.ROUTINE_NAME === 'sp_Usuarios_ValidarRespuestasSeguridad');
    console.log(viejo
      ? `   [AVISO] sp_Usuarios_ValidarRespuestasSeguridad todavia existe en ${viejo.ROUTINE_SCHEMA}`
      : '   [OK]    sp_Usuarios_ValidarRespuestasSeguridad ya fue eliminado');

    // ---- 6. Conclusion ----
    linea('6. RESUMEN');
    const esquemasTabla = [...new Set(tablas.map(t => t.TABLE_SCHEMA))];
    const esquemasSp = [...new Set(sps.map(s => s.ROUTINE_SCHEMA))];

    console.log(`   Tablas en : ${esquemasTabla.join(', ') || '(ninguna)'}`);
    console.log(`   SPs en    : ${esquemasSp.join(', ') || '(ninguno)'}`);
    console.log(`   App apunta: ${actual.BaseActual}`);

    if (esquemasTabla.length === 1 && esquemasTabla[0] !== actual.BaseActual) {
      console.log(`\n   >> Las tablas NO estan en la base a la que apunta el .env.`);
      console.log(`      Cambiar DB_NAME a "${esquemasTabla[0]}" probablemente resuelva todo.`);
    } else if (esquemasTabla.length > 1) {
      console.log(`\n   >> Hay tablas "Usuarios" en mas de una base. Hay copias duplicadas;`);
      console.log(`      hay que decidir cual es la buena antes de migrar.`);
    } else if (esquemasTabla.length === 1) {
      console.log(`\n   >> Tablas y conexion coinciden. El problema es otro.`);
    }

    console.log('');
  } catch (error) {
    console.error('\nError en el diagnostico:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

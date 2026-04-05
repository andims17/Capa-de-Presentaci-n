const express = require('express');
const router  = express.Router();
const { sql, getPool } = require('../config/db');

// ─── Helper: formatear hora TIME de SQL Server ───────────────────────────────
function formatHora(horaObj) {
  if (!horaObj) return '-';
  const h = horaObj.getUTCHours().toString().padStart(2, '0');
  const m = horaObj.getUTCMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = ((parseInt(h) % 12) || 12).toString().padStart(2, '0');
  return `${h12}:${m} ${ampm}`;
}

// ─── GET /inicio  →  Dashboard con datos reales ───────────────────────────────
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();

    // 1. Tarjetas de resumen
    const resumenResult = await pool.request().execute('sp_Dashboard_Resumen');
    const resumen = resumenResult.recordset[0] || {
      VentasHoy:          0,
      CitasHoy:           0,
      ProductosBajoStock: 0,
      TotalMascotas:      0,
    };

    // 2. Citas de hoy para la tabla
    const citasResult = await pool.request().execute('sp_Dashboard_CitasHoy');
    const citas = citasResult.recordset.map(c => ({
      ...c,
      HoraFormateada: formatHora(c.Hora),
    }));

    res.render('inicio/index', {
      title:    'Dashboard',
      resumen,
      citas,
    });

  } catch (err) {
    console.error('Error al cargar el dashboard:', err);
    // Si falla la BD, renderiza igual pero con valores en 0 y sin citas
    res.render('inicio/index', {
      title:    'Dashboard',
      resumen: { VentasHoy: 0, CitasHoy: 0, ProductosBajoStock: 0, TotalMascotas: 0 },
      citas:   [],
      error:   'No se pudo conectar con la base de datos.',
    });
  }
});

// ─── GET /inicio/panel  (mantener por compatibilidad) ─────────────────────────
router.get('/panel', (req, res) => {
  res.redirect('/inicio');
});

module.exports = router;


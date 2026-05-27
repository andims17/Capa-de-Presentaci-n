const express = require('express');
const router  = express.Router();
const { pool } = require('../config/db');

function formatHora(val) {
  if (!val) return '-';
  const str = typeof val === 'string' ? val : `${val.getUTCHours()}:${val.getUTCMinutes()}`;
  const [h, m] = str.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = ((h % 12) || 12).toString().padStart(2, '0');
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ─── GET /inicio  →  Dashboard ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [r1] = await pool.execute('CALL sp_Dashboard_Resumen()');
    const resumen = r1[0][0] || { VentasHoy: 0, CitasHoy: 0, ProductosBajoStock: 0, TotalMascotas: 0 };

    const [r2] = await pool.execute('CALL sp_Dashboard_CitasHoy()');
    const citas = r2[0].map(c => ({ ...c, HoraFormateada: formatHora(c.Hora) }));

    res.render('inicio/index', { title: 'Dashboard', resumen, citas });

  } catch (err) {
    console.error('Error al cargar el dashboard:', err);
    res.render('inicio/index', {
      title:   'Dashboard',
      resumen: { VentasHoy: 0, CitasHoy: 0, ProductosBajoStock: 0, TotalMascotas: 0 },
      citas:   [],
      error:   'No se pudo conectar con la base de datos.',
    });
  }
});

// ─── GET /inicio/panel  (compatibilidad) ─────────────────────────────────────
router.get('/panel', (req, res) => res.redirect('/inicio'));

module.exports = router;
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/cuenta/login');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.redirect('/cuenta/login');
  if (req.session.user.rolNombre !== 'Administrador') {
    return res.status(403).render('errors/403', { layout: false });
  }
  next();
}

module.exports = { requireLogin, requireAdmin };

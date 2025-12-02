
const express = require('express');
const router = express.Router();

router.get('/login', (req, res) => {
  res.render('cuenta/login', {
    layout: false,                     
    title: 'Iniciar Sesión - VetPost',
    error: null
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin') {
    
    return res.redirect('/inicio'); 
  }

  return res.render('cuenta/login', {
    layout: false,
    title: 'Iniciar Sesión - VetPost',
    error: 'Usuario o contraseña incorrectos'
  });
});

router.get('/logout', (req, res) => {
  res.redirect('/cuenta/login');
});

module.exports = router;

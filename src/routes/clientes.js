const express = require('express');
const router = express.Router();
const clientesModel = require('../models/clientesModel');
const { registrarEvento } = require('../models/logAuditoriaModel');

function obtenerIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || null;
}

/**
 * TC-039: normaliza la cedula al formato estandar 1-2345-6789.
 *
 * Acepta lo que el usuario escriba (con guiones, espacios o sin nada)
 * y devuelve siempre el mismo formato. La mascara del navegador hace
 * lo mismo al salir del campo, pero se valida igual aca: la mascara
 * del cliente se puede saltar.
 *
 * null      = campo vacio (la cedula es opcional)
 * undefined = valor invalido
 */
function normalizarCedula(valor) {
  if (!valor || !String(valor).trim()) return null;

  const digitos = String(valor).replace(/\D/g, '');
  if (digitos.length !== 9) return undefined;

  return `${digitos[0]}-${digitos.slice(1, 5)}-${digitos.slice(5)}`;
}

function validarCliente(data) {
  const telefonoRegex = /^[0-9]{8}$/;
  const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!data.NombreCompleto || !String(data.NombreCompleto).trim())
    return 'El nombre del cliente es obligatorio';

  if (data.Telefono && !telefonoRegex.test(String(data.Telefono).replace(/\D/g, '')))
    return 'El teléfono debe tener exactamente 8 dígitos';

  if (data.Email && !correoRegex.test(String(data.Email).trim()))
    return 'El correo electrónico no tiene un formato válido';

  // TC-039: la cedula es opcional, pero si viene debe tener 9 digitos
  if (normalizarCedula(data.Cedula) === undefined)
    return 'La cédula debe tener 9 dígitos (formato 1-2345-6789)';

  return null;
}

/**
 * Vuelve a mostrar la lista de clientes con un mensaje de error.
 * Antes se hacia res.send(texto), que dejaba al usuario en una
 * pagina en blanco sin forma de volver atras.
 */
async function renderClientesConError(res, mensaje) {
  let clientes = [];
  try {
    clientes = await clientesModel.listarClientes();
  } catch (e) {
    console.error(e);
  }

  return res.status(400).render('clientes/index', {
    title: 'Gestión de Clientes',
    clientes,
    error: mensaje
  });
}

router.get('/', async (req, res) => {
  try {
    const clientes = await clientesModel.listarClientes();
    res.render('clientes/index', {
      title: 'Gestión de Clientes',
      clientes
    });
  } catch (error) {
    console.error(error);
    res.render('clientes/index', { title: 'Gestión de Clientes', clientes: [] });
  }
});

router.post('/crear', async (req, res) => {
  try {
    const errorValidacion = validarCliente(req.body);
    if (errorValidacion) return await renderClientesConError(res, errorValidacion);

    // TC-036: no permitir dos clientes con el mismo correo
    if (await clientesModel.existeEmail(req.body.Email, 0)) {
      return await renderClientesConError(
        res,
        `Correo ya registrado: "${String(req.body.Email).trim()}" pertenece a otro cliente`
      );
    }

    await clientesModel.insertarCliente({
      NombreCompleto: String(req.body.NombreCompleto).trim(),
      Cedula: normalizarCedula(req.body.Cedula),
      Email: req.body.Email ? String(req.body.Email).trim() : null,
      Telefono: req.body.Telefono || null,
      Direccion: req.body.Direccion || null
    });

    registrarEvento({
      codigoEvento: 'CLI_CREADO',
      actorUsuarioId: req.session.user?.id ?? null,
      detalle: `Cliente creado: ${req.body.NombreCompleto}`,
      ip: obtenerIp(req)
    });

    res.redirect('/clientes');
  } catch (error) {
    console.error(error);
    return await renderClientesConError(res, 'Error creando el cliente. Revisa los datos e intenta de nuevo.');
  }
});

router.get('/editar/:id', async (req, res) => {
  try {
    const cliente = await clientesModel.obtenerClientePorId(req.params.id);
    if (!cliente) return await renderClientesConError(res, 'Cliente no encontrado');
    res.render('clientes/editar', {
      title: 'Editar Cliente',
      cliente
    });
  } catch (error) {
    console.error(error);
    return await renderClientesConError(res, 'Error cargando el cliente');
  }
});

router.post('/editar/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    const errorValidacion = validarCliente(req.body);
    if (errorValidacion) return await renderClientesConError(res, errorValidacion);

    // TC-036: misma validacion al editar, excluyendo al propio cliente
    // para que pueda guardarse sin cambiar su correo.
    if (await clientesModel.existeEmail(req.body.Email, id)) {
      return await renderClientesConError(
        res,
        `Correo ya registrado: "${String(req.body.Email).trim()}" pertenece a otro cliente`
      );
    }

    await clientesModel.actualizarCliente({
      Id: id,
      NombreCompleto: String(req.body.NombreCompleto).trim(),
      Cedula: normalizarCedula(req.body.Cedula),
      Telefono: req.body.Telefono || null,
      Email: req.body.Email ? String(req.body.Email).trim() : null,
      Direccion: req.body.Direccion || null
    });

    registrarEvento({
      codigoEvento: 'CLI_EDITADO',
      actorUsuarioId: req.session.user?.id ?? null,
      detalle: `Cliente editado: ${req.body.NombreCompleto} (ID ${id})`,
      ip: obtenerIp(req)
    });

    res.redirect('/clientes');
  } catch (error) {
    console.error(error);
    return await renderClientesConError(res, 'Error actualizando el cliente. Revisa los datos e intenta de nuevo.');
  }
});

router.post('/:id/desactivar', async (req, res) => {
  try {
    await clientesModel.setActivo(req.params.id, 0);

    registrarEvento({
      codigoEvento: 'CLI_ELIMINADO',
      actorUsuarioId: req.session.user?.id ?? null,
      detalle: `Cliente desactivado (ID ${req.params.id})`,
      ip: obtenerIp(req)
    });

    res.redirect('/clientes');
  } catch (error) {
    console.error(error);
    return await renderClientesConError(res, 'Error desactivando el cliente');
  }
});

router.post('/:id/activar', async (req, res) => {
  try {
    await clientesModel.setActivo(req.params.id, 1);

    registrarEvento({
      codigoEvento: 'CLI_EDITADO',
      actorUsuarioId: req.session.user?.id ?? null,
      detalle: `Cliente activado (ID ${req.params.id})`,
      ip: obtenerIp(req)
    });

    res.redirect('/clientes');
  } catch (error) {
    console.error(error);
    return await renderClientesConError(res, 'Error activando el cliente');
  }
});

module.exports = router;

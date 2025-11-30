using Microsoft.AspNetCore.Mvc;

namespace VetPostApp.Controladores
{
    public class ClientesController : Controller
    {
        public IActionResult Index()
        {
            ViewData["Titulo"] = "Gestión de Clientes";

            var clientes = new List<object>
            {
                new {
                    Id = 1,
                    Nombre = "Juan Pérez",
                    Telefono = "6333-6125",
                    Email = "juan@email.com",
                    Mascotas = "Max (Labrador), Toby (Golden)"
                },
                new {
                    Id = 2,
                    Nombre = "María Rodríguez",
                    Telefono = "6222-3344",
                    Email = "maria@email.com",
                    Mascotas = "Luna (Gato)"
                }
            };

            ViewBag.Clientes = clientes;
            return View();
        }

        [HttpPost]
        public IActionResult CrearCliente([FromBody] ClienteViewModel cliente)
        {
            var resultado = new
            {
                Exito = true,
                Mensaje = "Cliente creado correctamente",
                Id = new Random().Next(1000, 9999)
            };

            return Json(resultado);
        }

        [HttpGet]
        public IActionResult ObtenerCliente(int id)
        {
            var cliente = new
            {
                Id = id,
                Nombre = "Cliente Ejemplo",
                Telefono = "6333-6125",
                Email = "cliente@email.com",
                Direccion = "Dirección ejemplo"
            };

            return Json(cliente);
        }
    }

    public class ClienteViewModel
    {
        public string? Nombre { get; set; }
        public string? Telefono { get; set; }
        public string? Email { get; set; }
        public string? Direccion { get; set; }
    }
}
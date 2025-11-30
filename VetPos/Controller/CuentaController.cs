using Microsoft.AspNetCore.Mvc;

namespace VetPostWebApp.Controllers
{
    public class CuentaController : Controller
    {
        public IActionResult Login()
        {
            return View();
        }

        [HttpPost]
        public IActionResult Login(string username, string password)
        {
            if (username == "admin" && password == "admin")
            {
                return RedirectToAction("Index", "Inicio");
            }

            ViewBag.Error = "Usuario o contraseña incorrectos";
            return View();
        }

        public IActionResult Logout()
        {
            // Aquí iría la lógica real de logout
            return RedirectToAction("Login");
        }
    }
}
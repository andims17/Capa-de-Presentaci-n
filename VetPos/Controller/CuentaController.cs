using Microsoft.AspNetCore.Mvc;

namespace VetPostWebApp.Controllers
{
    public class CuentaController : Controller
    {
        public IActionResult Login()
        {
            return View();
        }
    }
}
using Microsoft.AspNetCore.Mvc;

namespace VetPostWebApp.Controllers
{
    public class InventarioController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Compras()
        {
            return View();
        }
    }
}
using Microsoft.AspNetCore.Mvc;

namespace VetPostWebApp.Controllers
{
    public class CitasController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Calendario()
        {
            return View();
        }
    }
}
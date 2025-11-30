using Microsoft.AspNetCore.Mvc;

namespace VetPostWebApp.Controllers
{
    public class VentasController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
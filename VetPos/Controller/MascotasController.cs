using Microsoft.AspNetCore.Mvc;

namespace VetPostWebApp.Controllers
{
    public class MascotasController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
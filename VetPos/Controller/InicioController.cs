using Microsoft.AspNetCore.Mvc;

namespace VetPostWebApp.Controllers
{
    public class InicioController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
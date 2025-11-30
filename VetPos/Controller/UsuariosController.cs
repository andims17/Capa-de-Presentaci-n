using Microsoft.AspNetCore.Mvc;

namespace VetPostWebApp.Controllers
{
    public class UsuariosController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
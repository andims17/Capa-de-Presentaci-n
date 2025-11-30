using Microsoft.AspNetCore.Mvc;

namespace VetPostWebApp.Controllers
{
    public class ClientesController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
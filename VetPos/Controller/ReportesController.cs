using Microsoft.AspNetCore.Mvc;

namespace VetPostWebApp.Controllers
{
    public class ReportesController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
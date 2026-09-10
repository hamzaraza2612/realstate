using Microsoft.AspNetCore.Mvc;

namespace RealEstateErp.Api.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected string? ClientIp => HttpContext.Connection.RemoteIpAddress?.ToString();
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Auth;

namespace RealEstateErp.Api.Controllers;

[Route("api/v1/auth")]
public class AuthController : ApiControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        var result = await _authService.LoginAsync(request.Email, request.Password, ClientIp, ct);
        if (!result.Succeeded)
        {
            return Unauthorized(new { title = result.Error, status = 401 });
        }
        return Ok(ApiResponse.Ok(result.Value));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh(RefreshRequest request, CancellationToken ct)
    {
        var result = await _authService.RefreshAsync(request.RefreshToken, ClientIp, ct);
        if (!result.Succeeded)
        {
            return Unauthorized(new { title = result.Error, status = 401 });
        }
        return Ok(ApiResponse.Ok(result.Value));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken ct)
    {
        await _authService.LogoutAsync(request.RefreshToken, ct);
        return NoContent();
    }
}

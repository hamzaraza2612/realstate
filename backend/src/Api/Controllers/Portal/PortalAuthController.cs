using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Portal;

namespace RealEstateErp.Api.Controllers.Portal;

[Route("api/v1/portal/auth")]
public class PortalAuthController : ApiControllerBase
{
    private readonly IPortalAuthService _authService;

    public PortalAuthController(IPortalAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(PortalLoginRequest request, CancellationToken ct)
    {
        var result = await _authService.LoginAsync(request.TenantSlug, request.Email, request.Password, ClientIp, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : Unauthorized(new { title = result.Error, status = 401 });
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenBody body, CancellationToken ct)
    {
        var result = await _authService.RefreshAsync(body.RefreshToken, ClientIp, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : Unauthorized(new { title = result.Error, status = 401 });
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenBody body, CancellationToken ct)
    {
        await _authService.LogoutAsync(body.RefreshToken, ct);
        return NoContent();
    }

    [HttpPost("request-password-reset")]
    [AllowAnonymous]
    public async Task<IActionResult> RequestPasswordReset(PortalRequestPasswordResetRequest request, CancellationToken ct)
    {
        await _authService.RequestPasswordResetAsync(request.TenantSlug, request.Email, ct);
        // Always 204 regardless of whether the email matched an account — see IPortalAuthService.
        return NoContent();
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword(PortalResetPasswordRequest request, CancellationToken ct)
    {
        var result = await _authService.ResetPasswordAsync(request.Token, request.NewPassword, ct);
        return result.Succeeded ? NoContent() : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpGet("me")]
    [RequirePortal]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var result = await _authService.GetProfileAsync(ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : Unauthorized(new { title = result.Error, status = 401 });
    }
}

public record RefreshTokenBody(string RefreshToken);

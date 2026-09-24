using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Property.SecurityDeposits;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/property/security-deposits")]
public class SecurityDepositsController : ApiControllerBase
{
    private readonly ISecurityDepositService _securityDepositService;

    public SecurityDepositsController(ISecurityDepositService securityDepositService)
    {
        _securityDepositService = securityDepositService;
    }

    [HttpPost("{id:guid}/receive")]
    [RequirePermission(Permissions.Property.LeaseManage)]
    public async Task<IActionResult> Receive(Guid id, ReceiveSecurityDepositRequest request, CancellationToken ct)
    {
        var result = await _securityDepositService.ReceiveAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/refund")]
    [RequirePermission(Permissions.Property.LeaseManage)]
    public async Task<IActionResult> Refund(Guid id, RefundSecurityDepositRequest request, CancellationToken ct)
    {
        var result = await _securityDepositService.RefundAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/forfeit")]
    [RequirePermission(Permissions.Property.LeaseManage)]
    public async Task<IActionResult> Forfeit(Guid id, ForfeitSecurityDepositRequest request, CancellationToken ct)
    {
        var result = await _securityDepositService.ForfeitAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}

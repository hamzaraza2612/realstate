using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Facility.Mall;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/facility/mall/service-charges")]
public class ServiceChargesController : ApiControllerBase
{
    private readonly IServiceChargeService _serviceChargeService;

    public ServiceChargesController(IServiceChargeService serviceChargeService)
    {
        _serviceChargeService = serviceChargeService;
    }

    [HttpGet("definitions")]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> ListDefinitions([FromQuery] PagedRequest request, [FromQuery] ServiceChargeDefinitionFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _serviceChargeService.ListDefinitionsAsync(request, filter, ct)));
    }

    [HttpPost("definitions")]
    [RequirePermission(Permissions.Facility.MallManage)]
    public async Task<IActionResult> CreateDefinition(CreateServiceChargeDefinitionRequest request, CancellationToken ct)
    {
        var result = await _serviceChargeService.CreateDefinitionAsync(request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("definitions/{id:guid}")]
    [RequirePermission(Permissions.Facility.MallManage)]
    public async Task<IActionResult> UpdateDefinition(Guid id, UpdateServiceChargeDefinitionRequest request, CancellationToken ct)
    {
        var result = await _serviceChargeService.UpdateDefinitionAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpGet("charges")]
    [RequirePermission(Permissions.Facility.View)]
    public async Task<IActionResult> ListCharges([FromQuery] PagedRequest request, [FromQuery] ServiceChargeChargeFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _serviceChargeService.ListChargesAsync(request, filter, ct)));
    }

    [HttpPost("charges/generate")]
    [RequirePermission(Permissions.Facility.MallManage)]
    public async Task<IActionResult> Generate(GenerateServiceChargeRequest request, CancellationToken ct)
    {
        var result = await _serviceChargeService.GenerateAsync(request, ct);
        return result.Succeeded
            ? Ok(ApiResponse.Ok(result.Value))
            : result.ErrorCode == "duplicate_charge"
                ? Conflict(new { title = result.Error, status = 409, code = result.ErrorCode })
                : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}

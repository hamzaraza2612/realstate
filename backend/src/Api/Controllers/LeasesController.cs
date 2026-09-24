using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Property.Leases;
using RealEstateErp.Application.Property.Payments;
using RealEstateErp.Application.Property.RentSchedules;
using RealEstateErp.Application.Property.SecurityDeposits;
using RealEstateErp.Domain.Property;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

[Authorize]
[Route("api/v1/property/leases")]
public class LeasesController : ApiControllerBase
{
    private readonly ILeaseService _leaseService;
    private readonly IRentScheduleService _rentScheduleService;
    private readonly IRentPaymentService _rentPaymentService;
    private readonly ISecurityDepositService _securityDepositService;

    public LeasesController(
        ILeaseService leaseService, IRentScheduleService rentScheduleService,
        IRentPaymentService rentPaymentService, ISecurityDepositService securityDepositService)
    {
        _leaseService = leaseService;
        _rentScheduleService = rentScheduleService;
        _rentPaymentService = rentPaymentService;
        _securityDepositService = securityDepositService;
    }

    [HttpGet]
    [RequirePermission(Permissions.Property.View)]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] LeaseFilter filter, CancellationToken ct)
    {
        return Ok(ApiResponse.Paged(await _leaseService.ListAsync(request, filter, ct)));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.Property.View)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _leaseService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost]
    [RequirePermission(Permissions.Property.LeaseManage)]
    public async Task<IActionResult> Create(CreateLeaseRequest request, CancellationToken ct)
    {
        var result = await _leaseService.CreateAsync(request, ct);
        if (result.Succeeded) return CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value));
        return result.ErrorCode == "unit_has_active_lease"
            ? Conflict(new { title = result.Error, status = 409, code = result.ErrorCode })
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.Property.LeaseManage)]
    public async Task<IActionResult> Update(Guid id, UpdateLeaseRequest request, CancellationToken ct)
    {
        var result = await _leaseService.UpdateAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpPost("{id:guid}/submit")]
    [RequirePermission(Permissions.Property.LeaseManage)]
    public async Task<IActionResult> Submit(Guid id, CancellationToken ct) => await Transition(id, LeaseStatus.PendingApproval, ct);

    [HttpPost("{id:guid}/approve")]
    [RequirePermission(Permissions.Property.LeaseApprove)]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct) => await Transition(id, LeaseStatus.Active, ct);

    [HttpPost("{id:guid}/expire")]
    [RequirePermission(Permissions.Property.LeaseManage)]
    public async Task<IActionResult> Expire(Guid id, CancellationToken ct) => await Transition(id, LeaseStatus.Expired, ct);

    [HttpPost("{id:guid}/terminate")]
    [RequirePermission(Permissions.Property.LeaseManage)]
    public async Task<IActionResult> Terminate(Guid id, CancellationToken ct) => await Transition(id, LeaseStatus.Terminated, ct);

    [HttpPost("{id:guid}/cancel")]
    [RequirePermission(Permissions.Property.LeaseManage)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct) => await Transition(id, LeaseStatus.Cancelled, ct);

    private async Task<IActionResult> Transition(Guid id, LeaseStatus target, CancellationToken ct)
    {
        var result = await _leaseService.ChangeStatusAsync(id, new ChangeLeaseStatusRequest(target), ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpGet("{id:guid}/rent-schedule")]
    [RequirePermission(Permissions.Property.View)]
    public async Task<IActionResult> RentSchedule(Guid id, CancellationToken ct)
    {
        var result = await _rentScheduleService.ListByLeaseAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpGet("{id:guid}/payments")]
    [RequirePermission(Permissions.Property.View)]
    public async Task<IActionResult> Payments(Guid id, CancellationToken ct)
    {
        var result = await _rentPaymentService.ListByLeaseAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost("{id:guid}/payments")]
    [RequirePermission(Permissions.Property.PaymentRecord)]
    public async Task<IActionResult> RecordPayment(Guid id, RecordRentPaymentRequest request, CancellationToken ct)
    {
        var result = await _rentPaymentService.RecordAsync(id, request, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpGet("{id:guid}/security-deposit")]
    [RequirePermission(Permissions.Property.View)]
    public async Task<IActionResult> SecurityDeposit(Guid id, CancellationToken ct)
    {
        var result = await _securityDepositService.GetByLeaseAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }
}

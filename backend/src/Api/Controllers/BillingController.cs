using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Common;
using RealEstateErp.Api.Authorization;
using RealEstateErp.Application.Billing;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Api.Controllers;

/// <summary>Tenant-facing read-only invoice/payment history — the other half of the tenant admin
/// billing view alongside SubscriptionController. IInvoiceService.ListForCurrentTenantAsync and
/// IBillingPaymentService.ListForCurrentTenantAsync both scope by the ambient tenant internally, so
/// there is no tenant id anywhere in this controller for a caller to substitute.</summary>
[Authorize]
[RequirePermission(Permissions.Subscription.View)]
[Route("api/v1/billing")]
public class BillingController : ApiControllerBase
{
    private readonly IInvoiceService _invoiceService;
    private readonly IBillingPaymentService _paymentService;

    public BillingController(IInvoiceService invoiceService, IBillingPaymentService paymentService)
    {
        _invoiceService = invoiceService;
        _paymentService = paymentService;
    }

    [HttpGet("invoices")]
    public async Task<IActionResult> ListInvoices([FromQuery] PagedRequest request, CancellationToken ct) =>
        Ok(ApiResponse.Paged(await _invoiceService.ListForCurrentTenantAsync(request, ct)));

    [HttpGet("invoices/{id:guid}")]
    public async Task<IActionResult> GetInvoice(Guid id, CancellationToken ct)
    {
        var result = await _invoiceService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpGet("payments")]
    public async Task<IActionResult> ListPayments(CancellationToken ct) =>
        Ok(ApiResponse.Ok(await _paymentService.ListForCurrentTenantAsync(ct)));
}

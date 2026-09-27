using Microsoft.AspNetCore.Mvc;
using RealEstateErp.Api.Common;
using RealEstateErp.Application.Billing;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Localization;
using RealEstateErp.Domain.Localization;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Api.Controllers;

/// <summary>Super Admin billing operations — generating invoices and recording payments received
/// against them. This milestone has no automated recurring billing engine and no real payment
/// gateway (see IBillingPaymentProvider); invoice generation and payment recording are both explicit
/// platform-admin actions. See docs/SAAS_BILLING.md. The eInvoice submission sub-resource
/// (Milestone 15) proves IEInvoiceProvider's seam is actually wired end-to-end — see
/// UnconfiguredEInvoiceProvider and docs/TAX_ENGINE.md; it always fails cleanly, never claiming a
/// real UAE/Saudi government or ASP integration.</summary>
[Route("api/v1/platform/invoices")]
public class PlatformInvoicesController : PlatformControllerBase
{
    private readonly IInvoiceService _invoiceService;
    private readonly IBillingPaymentService _paymentService;
    private readonly IEInvoiceSubmissionService _eInvoiceSubmissionService;

    public PlatformInvoicesController(
        IInvoiceService invoiceService, IBillingPaymentService paymentService,
        IEInvoiceSubmissionService eInvoiceSubmissionService, ITenantContext tenantContext) : base(tenantContext)
    {
        _invoiceService = invoiceService;
        _paymentService = paymentService;
        _eInvoiceSubmissionService = eInvoiceSubmissionService;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] PagedRequest request, [FromQuery] InvoiceFilter filter, CancellationToken ct) =>
        Ok(ApiResponse.Paged(await _invoiceService.ListAsync(request, filter, ct)));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await _invoiceService.GetAsync(id, ct);
        return result.Succeeded ? Ok(ApiResponse.Ok(result.Value)) : NotFound(new { title = result.Error, status = 404 });
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate(GenerateInvoiceRequest request, CancellationToken ct)
    {
        var result = await _invoiceService.GenerateAsync(request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpGet("{id:guid}/payments")]
    public async Task<IActionResult> ListPayments(Guid id, CancellationToken ct) =>
        Ok(ApiResponse.Ok(await _paymentService.ListForInvoiceAsync(id, ct)));

    [HttpPost("{id:guid}/payments")]
    public async Task<IActionResult> RecordPayment(Guid id, RecordInvoicePaymentBody body, CancellationToken ct)
    {
        var result = await _paymentService.RecordPaymentAsync(
            new RecordBillingPaymentRequest(id, body.Amount, body.PaymentDate, body.ProviderTransactionId, body.IdempotencyKey), ct);
        return result.Succeeded
            ? Ok(ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }

    [HttpGet("{id:guid}/einvoice-submissions")]
    public async Task<IActionResult> ListEInvoiceSubmissions(Guid id, CancellationToken ct) =>
        Ok(ApiResponse.Ok(await _eInvoiceSubmissionService.ListForInvoiceAsync(id, ct)));

    [HttpPost("{id:guid}/einvoice-submissions")]
    public async Task<IActionResult> SubmitEInvoice(Guid id, [FromQuery] EInvoiceDocumentType documentType, CancellationToken ct)
    {
        var result = await _eInvoiceSubmissionService.SubmitAsync(new EInvoiceSubmissionRequest(id, documentType), ct);
        return result.Succeeded
            ? Ok(ApiResponse.Ok(result.Value))
            : BadRequest(new { title = result.Error, status = 400, code = result.ErrorCode });
    }
}

public record RecordInvoicePaymentBody(decimal Amount, DateOnly PaymentDate, string? ProviderTransactionId, string IdempotencyKey);

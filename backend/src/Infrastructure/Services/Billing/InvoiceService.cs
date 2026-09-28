using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Billing;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Localization;
using RealEstateErp.Domain.Billing;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Billing;

public class InvoiceService : IInvoiceService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;
    private readonly ITaxCalculationService _taxCalculationService;
    private readonly ITenantTimeService _tenantTimeService;

    public InvoiceService(AppDbContext db, ITenantContext tenantContext, IAuditLogger auditLogger,
        ITaxCalculationService taxCalculationService, ITenantTimeService tenantTimeService)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
        _taxCalculationService = taxCalculationService;
        _tenantTimeService = tenantTimeService;
    }

    public async Task<PagedResult<InvoiceDto>> ListAsync(PagedRequest request, InvoiceFilter filter, CancellationToken ct = default)
    {
        var query = _db.Invoices.IgnoreQueryFilters().Include(i => i.LineItems).AsQueryable();
        if (filter.TenantId.HasValue) query = query.Where(i => i.TenantId == filter.TenantId);
        if (filter.Status.HasValue) query = query.Where(i => i.Status == filter.Status);

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(i => i.IssuedDate).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);

        var dtos = new List<InvoiceDto>();
        foreach (var invoice in items) dtos.Add(await ToDtoAsync(invoice, ct));
        return new PagedResult<InvoiceDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<PagedResult<InvoiceDto>> ListForCurrentTenantAsync(PagedRequest request, CancellationToken ct = default) =>
        await ListAsync(request, new InvoiceFilter(_tenantContext.TenantId, null), ct);

    public async Task<Result<InvoiceDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var invoice = await _db.Invoices.Include(i => i.LineItems).FirstOrDefaultAsync(i => i.Id == id, ct);
        return invoice is null ? Result.Failure<InvoiceDto>("Invoice not found.", "not_found") : Result.Success(await ToDtoAsync(invoice, ct));
    }

    public async Task<Result<InvoiceDto>> GenerateAsync(GenerateInvoiceRequest request, CancellationToken ct = default)
    {
        var subscription = await _db.Subscriptions.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.Id == request.SubscriptionId, ct);
        if (subscription is null) return Result.Failure<InvoiceDto>("Subscription not found.", "not_found");

        var plan = await _db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Id == subscription.PlanId, ct);

        var lineItems = (request.LineItems is { Count: > 0 } ? request.LineItems : new[]
        {
            new InvoiceLineItemInput($"Subscription: {plan?.Name ?? subscription.PlanId.ToString()}", 1, subscription.PriceSnapshot)
        }).Select(l => new InvoiceLineItem { Description = l.Description, Quantity = l.Quantity, UnitPrice = l.UnitPrice, Amount = l.Quantity * l.UnitPrice }).ToList();

        var subtotal = lineItems.Sum(l => l.Amount);
        var today = await _tenantTimeService.TodayForTenantAsync(subscription.TenantId, ct);

        // Tax: computed via the tax engine (snapshotted, auditable, never recomputed later) when a
        // rate code is given; otherwise the caller's explicit TaxAmount is used as-is — see
        // GenerateInvoiceRequest's doc comment.
        var taxAmount = request.TaxAmount;
        Guid? taxRateId = null;
        string? taxCode = null, taxName = null;
        decimal? taxPercentage = null;
        var taxInclusive = false;

        if (!string.IsNullOrWhiteSpace(request.TaxRateCode))
        {
            var tenantCountry = await _db.Tenants.IgnoreQueryFilters()
                .Where(t => t.Id == subscription.TenantId).Select(t => t.CountryCode).FirstOrDefaultAsync(ct) ?? "US";
            var taxResult = await _taxCalculationService.CalculateAsync(tenantCountry, request.TaxRateCode, subtotal, today, ct);
            if (taxResult.Applied)
            {
                taxAmount = taxResult.TaxAmount;
                taxRateId = taxResult.TaxRateId;
                taxCode = taxResult.RateCode;
                taxName = taxResult.RateName;
                taxPercentage = taxResult.Percentage;
                taxInclusive = taxResult.IsInclusive;
            }
            else
            {
                taxAmount = 0;
            }
        }

        var total = subtotal + taxAmount;

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var sequence = await _db.Invoices.IgnoreQueryFilters().CountAsync(i => i.TenantId == subscription.TenantId, ct) + 1 + attempt;
            var invoice = new Invoice
            {
                TenantId = subscription.TenantId,
                SubscriptionId = subscription.Id,
                InvoiceNumber = $"INV-{sequence:D6}",
                PeriodStart = DateOnly.FromDateTime(subscription.CurrentPeriodStart.UtcDateTime),
                PeriodEnd = DateOnly.FromDateTime(subscription.CurrentPeriodEnd.UtcDateTime),
                Subtotal = subtotal,
                TaxAmount = taxAmount,
                Total = total,
                Currency = subscription.Currency,
                Status = InvoiceStatus.Issued,
                IssuedDate = today,
                DueDate = today.AddDays(request.DueInDays),
                LineItems = lineItems,
                TaxRateId = taxRateId,
                TaxCode = taxCode,
                TaxName = taxName,
                TaxPercentage = taxPercentage,
                TaxInclusive = taxInclusive
            };

            _db.Invoices.Add(invoice);
            try
            {
                await _db.SaveChangesAsync(ct);

                await _auditLogger.LogAsync("Generate", "Billing", "Invoice", invoice.Id.ToString(),
                    after: new { invoice.InvoiceNumber, invoice.Total, invoice.Currency }, tenantIdOverride: invoice.TenantId, ct: ct);

                return Result.Success(await ToDtoAsync(invoice, ct));
            }
            catch (DbUpdateException) when (attempt < 4)
            {
                _db.Entry(invoice).State = EntityState.Detached;
                foreach (var line in lineItems) _db.Entry(line).State = EntityState.Detached;
            }
        }

        return Result.Failure<InvoiceDto>("Could not generate a unique invoice number. Please retry.", "invoice_number_conflict");
    }

    private async Task<InvoiceDto> ToDtoAsync(Invoice invoice, CancellationToken ct)
    {
        var tenantName = await _db.Tenants.IgnoreQueryFilters().Where(t => t.Id == invoice.TenantId).Select(t => t.Name).FirstOrDefaultAsync(ct) ?? "";
        return new InvoiceDto(
            invoice.Id, invoice.TenantId, tenantName, invoice.SubscriptionId, invoice.InvoiceNumber,
            invoice.PeriodStart, invoice.PeriodEnd, invoice.Subtotal, invoice.TaxAmount, invoice.Total,
            invoice.Currency, invoice.Status, invoice.IssuedDate, invoice.DueDate, invoice.PaidDate,
            invoice.ExternalProviderReference,
            invoice.LineItems.Select(l => new InvoiceLineItemDto(l.Id, l.Description, l.Quantity, l.UnitPrice, l.Amount)).ToList(),
            invoice.CreatedAt, invoice.TaxRateId, invoice.TaxCode, invoice.TaxName, invoice.TaxPercentage, invoice.TaxInclusive);
    }
}

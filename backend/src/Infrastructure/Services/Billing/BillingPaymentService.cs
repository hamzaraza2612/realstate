using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Billing;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Domain.Billing;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Billing;

public class BillingPaymentService : IBillingPaymentService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;

    public BillingPaymentService(AppDbContext db, ITenantContext tenantContext, IAuditLogger auditLogger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
    }

    public async Task<Result<BillingPaymentDto>> RecordPaymentAsync(RecordBillingPaymentRequest request, CancellationToken ct = default)
    {
        var invoice = await _db.Invoices.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.Id == request.InvoiceId, ct);
        if (invoice is null) return Result.Failure<BillingPaymentDto>("Invoice not found.", "not_found");

        var existing = await _db.BillingPayments.IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.TenantId == invoice.TenantId && p.IdempotencyKey == request.IdempotencyKey, ct);
        if (existing is not null) return Result.Success(ToDto(existing));

        if (invoice.Status is InvoiceStatus.Void)
            return Result.Failure<BillingPaymentDto>("Cannot record a payment against a void invoice.", "invoice_void");

        var payment = new BillingPayment
        {
            TenantId = invoice.TenantId,
            InvoiceId = invoice.Id,
            Amount = request.Amount,
            Currency = invoice.Currency,
            Status = BillingPaymentStatus.Succeeded,
            PaymentDate = request.PaymentDate,
            Provider = "manual",
            ProviderTransactionId = request.ProviderTransactionId,
            IdempotencyKey = request.IdempotencyKey
        };
        _db.BillingPayments.Add(payment);

        var paidTotal = await _db.BillingPayments.IgnoreQueryFilters()
            .Where(p => p.InvoiceId == invoice.Id && p.Status == BillingPaymentStatus.Succeeded)
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0;
        if (paidTotal + request.Amount >= invoice.Total)
        {
            invoice.Status = InvoiceStatus.Paid;
            invoice.PaidDate = request.PaymentDate;
        }

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Record", "Billing", "BillingPayment", payment.Id.ToString(),
            after: new { invoice.InvoiceNumber, payment.Amount, payment.Currency }, tenantIdOverride: invoice.TenantId, ct: ct);

        return Result.Success(ToDto(payment));
    }

    public async Task<IReadOnlyList<BillingPaymentDto>> ListForInvoiceAsync(Guid invoiceId, CancellationToken ct = default)
    {
        var payments = await _db.BillingPayments.IgnoreQueryFilters().Where(p => p.InvoiceId == invoiceId)
            .OrderByDescending(p => p.CreatedAt).ToListAsync(ct);
        return payments.Select(ToDto).ToList();
    }

    public async Task<IReadOnlyList<BillingPaymentDto>> ListForCurrentTenantAsync(CancellationToken ct = default)
    {
        if (_tenantContext.TenantId is not { } tenantId) return [];
        var payments = await _db.BillingPayments.IgnoreQueryFilters().Where(p => p.TenantId == tenantId)
            .OrderByDescending(p => p.CreatedAt).ToListAsync(ct);
        return payments.Select(ToDto).ToList();
    }

    private static BillingPaymentDto ToDto(BillingPayment p) => new(
        p.Id, p.TenantId, p.InvoiceId, p.Amount, p.Currency, p.Status, p.PaymentDate, p.Provider,
        p.ProviderTransactionId, p.FailureReason, p.CreatedAt);
}

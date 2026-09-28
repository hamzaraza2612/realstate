using FluentValidation;
using RealEstateErp.Domain.Billing;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Billing;

public record BillingPaymentDto(
    Guid Id, Guid TenantId, Guid InvoiceId, decimal Amount, string Currency, BillingPaymentStatus Status,
    DateOnly PaymentDate, string Provider, string? ProviderTransactionId, string? FailureReason, DateTimeOffset CreatedAt);

/// <summary>Records a payment that was already received (e.g. a platform admin confirming a bank
/// transfer) against an invoice. Idempotent on IdempotencyKey — retrying the exact same request
/// returns the original result rather than double-posting. No card data of any kind is accepted or
/// stored here.</summary>
public record RecordBillingPaymentRequest(Guid InvoiceId, decimal Amount, DateOnly PaymentDate, string? ProviderTransactionId, string IdempotencyKey);

public interface IBillingPaymentService
{
    Task<Result<BillingPaymentDto>> RecordPaymentAsync(RecordBillingPaymentRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<BillingPaymentDto>> ListForInvoiceAsync(Guid invoiceId, CancellationToken ct = default);

    /// <summary>Tenant-scoped payment history for the tenant-facing billing view.</summary>
    Task<IReadOnlyList<BillingPaymentDto>> ListForCurrentTenantAsync(CancellationToken ct = default);
}

public record ChargeRequest(Guid TenantId, Guid InvoiceId, decimal Amount, string Currency, string? Description);
public record ChargeResult(bool Succeeded, string? ProviderTransactionId, string? FailureReason);

/// <summary>
/// The extension seam a future real payment provider (Stripe, a UAE/GCC gateway, etc.) implements.
/// Deliberately NOT called by RecordPaymentAsync above — this milestone only records payments already
/// received, it does not execute a charge. Registered with exactly one implementation,
/// UnconfiguredBillingPaymentProvider, which always fails cleanly — mirrors
/// IPortalPaymentIntentProvider from Milestone 13's "safe by default, real behavior added later
/// behind an unchanged interface" shape. See docs/SAAS_BILLING.md.
/// </summary>
public interface IBillingPaymentProvider
{
    string ProviderName { get; }
    Task<Result<ChargeResult>> ChargeAsync(ChargeRequest request, CancellationToken ct = default);
}

public class RecordBillingPaymentRequestValidator : AbstractValidator<RecordBillingPaymentRequest>
{
    public RecordBillingPaymentRequestValidator()
    {
        RuleFor(x => x.InvoiceId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.IdempotencyKey).NotEmpty().MaximumLength(200);
    }
}

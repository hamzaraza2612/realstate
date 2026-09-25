using FluentValidation;
using RealEstateErp.Domain.Billing;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Billing;

public record InvoiceLineItemDto(Guid Id, string Description, decimal Quantity, decimal UnitPrice, decimal Amount);

public record InvoiceDto(
    Guid Id, Guid TenantId, string TenantName, Guid SubscriptionId, string InvoiceNumber,
    DateOnly PeriodStart, DateOnly PeriodEnd, decimal Subtotal, decimal TaxAmount, decimal Total,
    string Currency, InvoiceStatus Status, DateOnly IssuedDate, DateOnly DueDate, DateOnly? PaidDate,
    string? ExternalProviderReference, IReadOnlyList<InvoiceLineItemDto> LineItems, DateTimeOffset CreatedAt);

public record InvoiceLineItemInput(string Description, decimal Quantity, decimal UnitPrice);

/// <summary>Generates an invoice for a subscription's current billing period. Amounts are computed
/// from the supplied line items (defaulting to a single "Subscription: {plan name}" line at the
/// subscription's PriceSnapshot when none are given) — this milestone has no automated recurring
/// billing engine; a platform admin (or, later, a scheduled job) triggers generation explicitly.</summary>
public record GenerateInvoiceRequest(Guid SubscriptionId, decimal TaxAmount, IReadOnlyList<InvoiceLineItemInput>? LineItems, int DueInDays);

public record InvoiceFilter(Guid? TenantId, InvoiceStatus? Status);

public interface IInvoiceService
{
    Task<PagedResult<InvoiceDto>> ListAsync(PagedRequest request, InvoiceFilter filter, CancellationToken ct = default);
    Task<Result<InvoiceDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result<InvoiceDto>> GenerateAsync(GenerateInvoiceRequest request, CancellationToken ct = default);

    /// <summary>Tenant-scoped read for the tenant-facing billing view — same underlying query as
    /// ListAsync, filtered to the ambient tenant, so a tenant admin can never pass another tenant's id.</summary>
    Task<PagedResult<InvoiceDto>> ListForCurrentTenantAsync(PagedRequest request, CancellationToken ct = default);
}

public class GenerateInvoiceRequestValidator : AbstractValidator<GenerateInvoiceRequest>
{
    public GenerateInvoiceRequestValidator()
    {
        RuleFor(x => x.SubscriptionId).NotEmpty();
        RuleFor(x => x.TaxAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DueInDays).GreaterThanOrEqualTo(0);
        RuleForEach(x => x.LineItems).ChildRules(l =>
        {
            l.RuleFor(x => x.Description).NotEmpty();
            l.RuleFor(x => x.Quantity).GreaterThan(0);
            l.RuleFor(x => x.UnitPrice).GreaterThanOrEqualTo(0);
        });
    }
}

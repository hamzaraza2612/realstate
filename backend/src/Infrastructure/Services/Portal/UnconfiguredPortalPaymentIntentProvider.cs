using RealEstateErp.Application.Portal;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Portal;

/// <summary>
/// Safe-by-default registration for IPortalPaymentIntentProvider — the same "works out of the box,
/// does nothing real" shape as Milestone 11's LoggingEmailSender. No portal endpoint calls this in
/// this milestone (no real gateway integration is in scope); it exists purely so the extension point
/// has a real, registered implementation rather than an unregistered interface.
/// </summary>
public class UnconfiguredPortalPaymentIntentProvider : IPortalPaymentIntentProvider
{
    public string ProviderName => "none";

    public Task<Result<PaymentIntentResult>> CreateIntentAsync(CreatePaymentIntentRequest request, CancellationToken ct = default) =>
        Task.FromResult(Result.Failure<PaymentIntentResult>(
            "Online payment is not configured for this organization yet.", "payment_provider_not_configured"));
}

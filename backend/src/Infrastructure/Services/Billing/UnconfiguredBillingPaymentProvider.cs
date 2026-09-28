using RealEstateErp.Application.Billing;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Billing;

/// <summary>The only registered IBillingPaymentProvider in this milestone — always fails cleanly with
/// no side effects, exactly mirroring Milestone 13's UnconfiguredPortalPaymentIntentProvider. A real
/// gateway (Stripe, a UAE/GCC provider) replaces this registration in a future milestone; nothing
/// above this interface changes. See docs/SAAS_BILLING.md.</summary>
public class UnconfiguredBillingPaymentProvider : IBillingPaymentProvider
{
    public string ProviderName => "none";

    public Task<Result<ChargeResult>> ChargeAsync(ChargeRequest request, CancellationToken ct = default) =>
        Task.FromResult(Result.Failure<ChargeResult>(
            "No payment provider is configured for this platform yet.", "payment_provider_not_configured"));
}

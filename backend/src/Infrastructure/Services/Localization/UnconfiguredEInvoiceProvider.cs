using RealEstateErp.Application.Localization;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Localization;

/// <summary>The only IEInvoiceProvider this milestone registers — always fails cleanly, exactly
/// mirroring Milestone 14's UnconfiguredBillingPaymentProvider. Proves the seam is wired (something
/// really implements the interface and is really called by EInvoiceSubmissionService) without
/// claiming any UAE/Saudi government or ASP integration exists. A real adapter (e.g.
/// UaeAspEInvoiceProvider, SaudiZatcaEInvoiceProvider) would replace this registration in
/// DependencyInjection.cs — no other code would need to change.</summary>
public class UnconfiguredEInvoiceProvider : IEInvoiceProvider
{
    public string ProviderName => "unconfigured";

    public Task<Result<EInvoiceProviderResult>> SubmitAsync(EInvoiceSubmissionRequest request, CancellationToken ct = default) =>
        Task.FromResult(Result.Failure<EInvoiceProviderResult>(
            "No e-invoicing provider is configured for this tenant's country.", "einvoice_provider_not_configured"));

    public Task<Result<EInvoiceProviderResult>> ValidateAsync(EInvoiceSubmissionRequest request, CancellationToken ct = default) =>
        Task.FromResult(Result.Failure<EInvoiceProviderResult>(
            "No e-invoicing provider is configured for this tenant's country.", "einvoice_provider_not_configured"));
}

namespace RealEstateErp.Application.Portal;

/// <summary>
/// The clean extension point Milestone 13 asks for, deliberately unimplemented: no real payment
/// gateway (Stripe, a regional/UAE provider, or any other) is wired up in this milestone, and no
/// portal endpoint calls this yet — the portals only expose existing payment/receipt/history data.
/// Registering a real provider later means implementing this interface and swapping the DI
/// registration in DependencyInjection.cs; nothing above this seam needs to change. The only
/// registered implementation today, UnconfiguredPortalPaymentIntentProvider, always fails cleanly —
/// the same "safe by default, real behavior added later behind an unchanged interface" shape as
/// Milestone 11's IEmailSender/LoggingEmailSender.
/// </summary>
public record CreatePaymentIntentRequest(string ActorType, Guid ActorId, string ReferenceType, Guid ReferenceId, decimal Amount, string CurrencyCode);

public record PaymentIntentResult(string ProviderName, string ProviderReference, string RedirectUrl);

public interface IPortalPaymentIntentProvider
{
    string ProviderName { get; }
    Task<Shared.Common.Result<PaymentIntentResult>> CreateIntentAsync(CreatePaymentIntentRequest request, CancellationToken ct = default);
}

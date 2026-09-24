using RealEstateErp.Domain.Communication;
using RealEstateErp.Domain.Notifications;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Communication;

/// <summary>Provider-agnostic outbound email seam. The default registered implementation
/// (LoggingEmailSender) never contacts a real mail server — it writes to the structured log and
/// CommunicationLog, so the application works fully in development and in tests with no SMTP
/// dependency. A production deployment swaps in an SMTP/SendGrid implementation of this same
/// interface; nothing above this layer changes.</summary>
public interface IEmailSender
{
    Task<Result> SendAsync(string toAddress, string subject, string body, CancellationToken ct = default);
}

/// <summary>The single entry point every module calls to notify a user — resolves the user's
/// per-category channel preferences, creates an in-app Notification when requested and allowed, calls
/// IEmailSender when requested and allowed, and always writes a CommunicationLog row per channel
/// actually attempted (Sent/Failed/Skipped).</summary>
public interface ICommunicationService
{
    Task SendAsync(SendCommunicationRequest request, CancellationToken ct = default);
}

public record SendCommunicationRequest(
    Guid UserId,
    CommunicationChannel Channels,
    NotificationCategory Category,
    string Title,
    string Body,
    string? EntityType = null,
    Guid? EntityId = null);

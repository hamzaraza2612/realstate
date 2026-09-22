using Microsoft.Extensions.Logging;
using RealEstateErp.Application.Communication;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Communication;

/// <summary>
/// Development-safe default IEmailSender — writes the message to the structured log instead of
/// contacting a real mail server, so the application (and every test) runs with no SMTP dependency.
/// A production deployment registers a real provider (SMTP/SendGrid/etc.) implementing the same
/// interface in its place; nothing else in the codebase needs to change.
/// </summary>
public class LoggingEmailSender : IEmailSender
{
    private readonly ILogger<LoggingEmailSender> _logger;

    public LoggingEmailSender(ILogger<LoggingEmailSender> logger)
    {
        _logger = logger;
    }

    public Task<Result> SendAsync(string toAddress, string subject, string body, CancellationToken ct = default)
    {
        _logger.LogInformation("[DEV EMAIL] To: {ToAddress} | Subject: {Subject} | Body: {Body}", toAddress, subject, body);
        return Task.FromResult(Result.Success());
    }
}

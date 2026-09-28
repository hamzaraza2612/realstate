using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RealEstateErp.Application.Communication;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Communication;

/// <summary>
/// Production IEmailSender — sends through a configured SMTP relay (SendGrid, Amazon SES, Postmark,
/// a corporate mail server, etc. all speak SMTP) using the built-in .NET System.Net.Mail client, so
/// no new NuGet dependency is needed for this milestone's scope. Registered only when
/// Smtp:Enabled=true (see DependencyInjection.cs); LoggingEmailSender stays the default everywhere
/// else, including every test. Never logs the configured password. Retries a transient SmtpException
/// up to Smtp:MaxRetries times with a short linear backoff before giving up and reporting failure —
/// the caller (ICommunicationService) already writes a CommunicationLog row either way.
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly SmtpSettings _settings;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<SmtpSettings> settings, ILogger<SmtpEmailSender> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<Result> SendAsync(string toAddress, string subject, string body, CancellationToken ct = default, bool isHtml = false)
    {
        for (var attempt = 0; attempt <= _settings.MaxRetries; attempt++)
        {
            try
            {
                using var client = new SmtpClient(_settings.Host, _settings.Port)
                {
                    EnableSsl = _settings.EnableSsl,
                    Timeout = _settings.TimeoutSeconds * 1000,
                    Credentials = string.IsNullOrEmpty(_settings.Username)
                        ? null
                        : new NetworkCredential(_settings.Username, _settings.Password)
                };

                using var message = new MailMessage
                {
                    From = new MailAddress(_settings.FromAddress, _settings.FromName),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = isHtml
                };
                message.To.Add(toAddress);

                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                timeoutCts.CancelAfter(TimeSpan.FromSeconds(_settings.TimeoutSeconds));
                await client.SendMailAsync(message, timeoutCts.Token);

                return Result.Success();
            }
            catch (Exception ex) when (ex is SmtpException or OperationCanceledException && attempt < _settings.MaxRetries)
            {
                _logger.LogWarning("SMTP send attempt {Attempt} to {ToAddress} failed, retrying: {Message}", attempt + 1, toAddress, ex.Message);
                await Task.Delay(TimeSpan.FromSeconds(attempt + 1), ct);
            }
            catch (Exception ex)
            {
                // Never include _settings.Password/Username in the log — only the recipient and error shape.
                _logger.LogError(ex, "SMTP send to {ToAddress} failed permanently.", toAddress);
                return Result.Failure("Failed to send email.", "email_send_failed");
            }
        }

        return Result.Failure("Failed to send email after retrying.", "email_send_failed");
    }
}

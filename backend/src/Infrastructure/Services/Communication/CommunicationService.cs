using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Communication;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Domain.Communication;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Communication;

public class CommunicationService : ICommunicationService
{
    private readonly AppDbContext _db;
    private readonly INotificationService _notificationService;
    private readonly INotificationPreferenceService _preferenceService;
    private readonly IEmailSender _emailSender;

    public CommunicationService(AppDbContext db, INotificationService notificationService,
        INotificationPreferenceService preferenceService, IEmailSender emailSender)
    {
        _db = db;
        _notificationService = notificationService;
        _preferenceService = preferenceService;
        _emailSender = emailSender;
    }

    public async Task SendAsync(SendCommunicationRequest request, CancellationToken ct = default)
    {
        var (inAppEnabled, emailEnabled) = await _preferenceService.GetEffectiveAsync(request.UserId, request.Category, ct);

        if (request.Channels.HasFlag(CommunicationChannel.InApp))
        {
            if (inAppEnabled)
            {
                await _notificationService.CreateAsync(request.UserId, request.Category, request.Title, request.Body,
                    request.EntityType, request.EntityId, ct);
                await LogAsync(CommunicationChannel.InApp, request, null, CommunicationStatus.Sent, null, ct);
            }
            else
            {
                await LogAsync(CommunicationChannel.InApp, request, null, CommunicationStatus.Skipped, "Disabled by user preference", ct);
            }
        }

        if (request.Channels.HasFlag(CommunicationChannel.Email))
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, ct);
            if (user?.Email is null)
            {
                await LogAsync(CommunicationChannel.Email, request, null, CommunicationStatus.Failed, "Recipient has no email address", ct);
            }
            else if (!emailEnabled)
            {
                await LogAsync(CommunicationChannel.Email, request, user.Email, CommunicationStatus.Skipped, "Disabled by user preference", ct);
            }
            else
            {
                var result = await _emailSender.SendAsync(user.Email, request.Title, request.Body, ct);
                await LogAsync(CommunicationChannel.Email, request, user.Email,
                    result.Succeeded ? CommunicationStatus.Sent : CommunicationStatus.Failed, result.Error, ct);
            }
        }

        foreach (var unsupported in new[] { CommunicationChannel.WhatsApp, CommunicationChannel.Sms, CommunicationChannel.Push })
        {
            if (request.Channels.HasFlag(unsupported))
            {
                await LogAsync(unsupported, request, null, CommunicationStatus.Skipped, "Provider not yet implemented", ct);
            }
        }
    }

    private async Task LogAsync(CommunicationChannel channel, SendCommunicationRequest request, string? recipientAddress,
        CommunicationStatus status, string? errorMessage, CancellationToken ct)
    {
        _db.CommunicationLogs.Add(new CommunicationLog
        {
            Channel = channel,
            RecipientUserId = request.UserId,
            RecipientAddress = recipientAddress,
            Subject = request.Title,
            Body = request.Body,
            Status = status,
            ErrorMessage = errorMessage,
            EntityType = request.EntityType,
            EntityId = request.EntityId
        });
        await _db.SaveChangesAsync(ct);
    }
}

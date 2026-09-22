using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Domain.Notifications;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Notifications;

public class NotificationPreferenceService : INotificationPreferenceService
{
    private static readonly NotificationCategory[] AllCategories = Enum.GetValues<NotificationCategory>();

    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public NotificationPreferenceService(AppDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    public async Task<IReadOnlyList<NotificationPreferenceDto>> GetMineAsync(CancellationToken ct = default)
    {
        var userId = _tenantContext.UserId ?? Guid.Empty;
        var existing = await _db.NotificationPreferences.Where(p => p.UserId == userId).ToDictionaryAsync(p => p.Category, ct);

        return AllCategories.Select(category => existing.TryGetValue(category, out var pref)
            ? new NotificationPreferenceDto(category, pref.InAppEnabled, pref.EmailEnabled)
            : new NotificationPreferenceDto(category, true, true)).ToList();
    }

    public async Task<NotificationPreferenceDto> UpdateMineAsync(UpdateNotificationPreferenceRequest request, CancellationToken ct = default)
    {
        var userId = _tenantContext.UserId ?? Guid.Empty;
        var preference = await _db.NotificationPreferences.FirstOrDefaultAsync(p => p.UserId == userId && p.Category == request.Category, ct);

        if (preference is null)
        {
            preference = new NotificationPreference { UserId = userId, Category = request.Category };
            _db.NotificationPreferences.Add(preference);
        }

        preference.InAppEnabled = request.InAppEnabled;
        preference.EmailEnabled = request.EmailEnabled;
        await _db.SaveChangesAsync(ct);

        return new NotificationPreferenceDto(preference.Category, preference.InAppEnabled, preference.EmailEnabled);
    }

    public async Task<(bool InAppEnabled, bool EmailEnabled)> GetEffectiveAsync(Guid userId, NotificationCategory category, CancellationToken ct = default)
    {
        var preference = await _db.NotificationPreferences.FirstOrDefaultAsync(p => p.UserId == userId && p.Category == category, ct);
        return preference is null ? (true, true) : (preference.InAppEnabled, preference.EmailEnabled);
    }
}

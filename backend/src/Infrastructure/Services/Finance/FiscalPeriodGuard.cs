using Microsoft.EntityFrameworkCore;
using RealEstateErp.Domain.Finance;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Finance;

/// <summary>
/// Shared by every journal-entry creation path (manual entries and all four system posting services)
/// so "don't post into a closed period" is enforced identically everywhere instead of being
/// reimplemented per-service. A date with no defined FiscalPeriod at all is always allowed — periods
/// are opt-in, so a tenant that never creates one sees no behavior change.
/// </summary>
public static class FiscalPeriodGuard
{
    public static Task<bool> IsClosedAsync(AppDbContext db, DateOnly date, CancellationToken ct = default) =>
        db.FiscalPeriods.AnyAsync(p => p.Status == FiscalPeriodStatus.Closed && date >= p.StartDate && date <= p.EndDate, ct);
}

namespace RealEstateErp.Application.Reporting.Common;

/// <summary>
/// The one place every period-scoped report resolves its default date range, so "no dates given"
/// means the same thing across the whole Reporting module: the current calendar month to date, in the
/// requesting tenant's own timezone (Milestone 15) — a UAE tenant's "today" and a US tenant's "today"
/// can legitimately be different calendar dates at the same instant, so callers pass in
/// ITenantTimeService.TodayAsync() rather than this class assuming UTC. A caller can always override
/// both ends explicitly; only missing values fall back to this default.
/// </summary>
public static class ReportDateRange
{
    public static (DateOnly From, DateOnly To) Resolve(DateOnly? from, DateOnly? to, DateOnly today)
    {
        var resolvedTo = to ?? today;
        var resolvedFrom = from ?? new DateOnly(resolvedTo.Year, resolvedTo.Month, 1);
        return (resolvedFrom, resolvedTo);
    }
}

namespace RealEstateErp.Shared.Common;

/// <summary>
/// Pure timezone-conversion helpers — no DI, no DB access, fully unit-testable — used everywhere a
/// tenant-local calendar day (not just a UTC instant) matters: invoice issue/due dates, report "today"
/// defaults, etc. Every timestamp in this codebase is still stored in UTC (DateTimeOffset); this
/// class only answers "what calendar date is that instant in tenant X's timezone", never changes how
/// anything is persisted. See docs/LOCALIZATION.md "Timezone handling".
/// </summary>
public static class TenantClock
{
    /// <summary>Resolves an IANA (or Windows) timezone id, falling back to UTC for an unrecognized
    /// or empty id rather than throwing — a tenant's Timezone field is free text validated loosely at
    /// write time, so a defensive fallback here keeps every read site simple.</summary>
    public static TimeZoneInfo ResolveTimeZone(string? timezoneId)
    {
        if (string.IsNullOrWhiteSpace(timezoneId)) return TimeZoneInfo.Utc;
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timezoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.Utc;
        }
        catch (InvalidTimeZoneException)
        {
            return TimeZoneInfo.Utc;
        }
    }

    public static DateTimeOffset ConvertToTimeZone(DateTimeOffset utcInstant, string? timezoneId) =>
        TimeZoneInfo.ConvertTime(utcInstant, ResolveTimeZone(timezoneId));

    /// <summary>The calendar date `utcInstant` falls on in the given timezone — e.g. 23:30 UTC on the
    /// 1st is already the 2nd in Asia/Dubai (UTC+4).</summary>
    public static DateOnly TodayInTimeZone(DateTimeOffset utcInstant, string? timezoneId) =>
        DateOnly.FromDateTime(ConvertToTimeZone(utcInstant, timezoneId).DateTime);
}

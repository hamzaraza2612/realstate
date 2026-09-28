using FluentAssertions;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.UnitTests;

public class TenantClockTests
{
    // 23:30 UTC on Jan 1st — already the 2nd in every zone ahead of UTC, still the 1st behind it.
    private static readonly DateTimeOffset LateNightUtc = new(2026, 1, 1, 23, 30, 0, TimeSpan.Zero);

    [Theory]
    [InlineData("Asia/Dubai", 2026, 1, 2)] // UTC+4
    [InlineData("Asia/Riyadh", 2026, 1, 2)] // UTC+3
    [InlineData("Asia/Karachi", 2026, 1, 2)] // UTC+5
    [InlineData("Europe/London", 2026, 1, 1)] // UTC+0 in January
    [InlineData("America/New_York", 2026, 1, 1)] // UTC-5
    public void TodayInTimeZone_ShiftsTheCalendarDayCorrectlyForEachTenantTimezone(string timezoneId, int year, int month, int day)
    {
        TenantClock.TodayInTimeZone(LateNightUtc, timezoneId).Should().Be(new DateOnly(year, month, day));
    }

    [Fact]
    public void TodayInTimeZone_UnknownTimezone_FallsBackToUtc_RatherThanThrowing()
    {
        TenantClock.TodayInTimeZone(LateNightUtc, "Not/ARealZone").Should().Be(new DateOnly(2026, 1, 1));
    }

    [Fact]
    public void TodayInTimeZone_NullOrEmptyTimezone_FallsBackToUtc()
    {
        TenantClock.TodayInTimeZone(LateNightUtc, null).Should().Be(new DateOnly(2026, 1, 1));
        TenantClock.TodayInTimeZone(LateNightUtc, "").Should().Be(new DateOnly(2026, 1, 1));
    }

    [Fact]
    public void DifferentTenantsAtTheSameInstant_CanLegitimatelySeeDifferentCalendarDates()
    {
        var dubaiToday = TenantClock.TodayInTimeZone(LateNightUtc, "Asia/Dubai");
        var newYorkToday = TenantClock.TodayInTimeZone(LateNightUtc, "America/New_York");

        dubaiToday.Should().NotBe(newYorkToday);
    }
}

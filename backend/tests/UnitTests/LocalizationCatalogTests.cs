using FluentAssertions;
using RealEstateErp.Domain.Localization;

namespace RealEstateErp.UnitTests;

public class LocalizationCatalogTests
{
    [Theory]
    [InlineData("AE", "AED")]
    [InlineData("SA", "SAR")]
    [InlineData("PK", "PKR")]
    [InlineData("GB", "GBP")]
    [InlineData("US", "USD")]
    public void CountryCatalog_KnownCountry_HasExpectedDefaultCurrency(string alpha2, string expectedCurrency)
    {
        CountryCatalog.Find(alpha2)!.DefaultCurrency.Should().Be(expectedCurrency);
    }

    [Fact]
    public void CountryCatalog_UnknownCountry_ReturnsNull_RatherThanThrowing()
    {
        CountryCatalog.Find("ZZ").Should().BeNull();
        CountryCatalog.Find(null).Should().BeNull();
    }

    [Fact]
    public void CountryCatalog_IncludesAllGccCountriesForArchitectureCoverage()
    {
        foreach (var code in new[] { "AE", "SA", "QA", "BH", "KW", "OM" })
        {
            CountryCatalog.IsKnown(code).Should().BeTrue($"{code} should be a known GCC country");
        }
    }

    [Theory]
    [InlineData("AED", 2)]
    [InlineData("USD", 2)]
    [InlineData("BHD", 3)] // 3-decimal-place currencies must not be rounded like everything else
    [InlineData("KWD", 3)]
    [InlineData("OMR", 3)]
    public void CurrencyCatalog_DecimalPlaces_MatchesIsoConvention_NotAHardcodedTwo(string code, int expectedDecimals)
    {
        CurrencyCatalog.DecimalPlacesFor(code).Should().Be(expectedDecimals);
    }

    [Fact]
    public void CurrencyCatalog_Round_UsesTheCurrencysOwnPrecision()
    {
        CurrencyCatalog.Round(10.005m, "AED").Should().Be(10.01m); // AwayFromZero at 2dp
        CurrencyCatalog.Round(10.0055m, "BHD").Should().Be(10.006m); // 3dp for BHD, not 2
    }

    [Fact]
    public void CurrencyCatalog_UnknownCurrency_DefaultsToTwoDecimalPlaces_RatherThanThrowing()
    {
        CurrencyCatalog.DecimalPlacesFor("ZZZ").Should().Be(2);
    }
}

using FluentAssertions;
using RealEstateErp.Domain.Subscription;

namespace RealEstateErp.UnitTests;

public class EntitlementCodesTests
{
    [Fact]
    public void All_ContainsNoDuplicateKeys()
    {
        // A Dictionary can't have duplicate keys by construction, but this documents the intent:
        // every constant declared on EntitlementCodes must have a distinct string value.
        var values = new[]
        {
            EntitlementCodes.Crm, EntitlementCodes.Sales, EntitlementCodes.Finance, EntitlementCodes.Construction,
            EntitlementCodes.Procurement, EntitlementCodes.Rental, EntitlementCodes.Facility, EntitlementCodes.Mall,
            EntitlementCodes.Coworking, EntitlementCodes.ExternalPortals, EntitlementCodes.Documents,
            EntitlementCodes.Approvals, EntitlementCodes.Reporting, EntitlementCodes.AdvancedReporting,
            EntitlementCodes.ApiAccess, EntitlementCodes.MaxUsers, EntitlementCodes.MaxProperties,
            EntitlementCodes.MaxProjects, EntitlementCodes.MaxPortalUsers, EntitlementCodes.MaxStorageMb
        };
        values.Should().OnlyHaveUniqueItems();
        EntitlementCodes.All.Should().HaveCount(values.Length);
    }

    [Fact]
    public void All_LimitCodesAreTypedAsLimit_FeatureCodesAreTypedAsFeature()
    {
        EntitlementCodes.All[EntitlementCodes.MaxUsers].Should().Be(EntitlementType.Limit);
        EntitlementCodes.All[EntitlementCodes.MaxProperties].Should().Be(EntitlementType.Limit);
        EntitlementCodes.All[EntitlementCodes.MaxProjects].Should().Be(EntitlementType.Limit);
        EntitlementCodes.All[EntitlementCodes.MaxPortalUsers].Should().Be(EntitlementType.Limit);
        EntitlementCodes.All[EntitlementCodes.MaxStorageMb].Should().Be(EntitlementType.Limit);

        EntitlementCodes.All[EntitlementCodes.ExternalPortals].Should().Be(EntitlementType.Feature);
        EntitlementCodes.All[EntitlementCodes.AdvancedReporting].Should().Be(EntitlementType.Feature);
        EntitlementCodes.All[EntitlementCodes.Facility].Should().Be(EntitlementType.Feature);
    }

    [Fact]
    public void All_EveryCodeIsLowerSnakeCase()
    {
        EntitlementCodes.All.Keys.Should().OnlyContain(code => code == code.ToLowerInvariant() && !code.Contains(' '));
    }
}

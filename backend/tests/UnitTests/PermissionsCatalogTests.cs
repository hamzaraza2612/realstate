using FluentAssertions;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.UnitTests;

public class PermissionsCatalogTests
{
    [Fact]
    public void All_ContainsNoDuplicates()
    {
        Permissions.All.Should().OnlyHaveUniqueItems();
    }

    [Fact]
    public void All_EveryCodeFollowsModuleDotEntityDotActionConvention()
    {
        Permissions.All.Should().OnlyContain(code => code.Contains('.') && code == code.ToLowerInvariant());
    }

    [Fact]
    public void All_IncludesCoreSalesAndFinancePermissionsFromTheSpec()
    {
        Permissions.All.Should().Contain(new[]
        {
            Permissions.Sales.BookingCreate,
            Permissions.Sales.BookingApprove,
            Permissions.Sales.BookingCancel,
            Permissions.Sales.PaymentRecord,
            Permissions.Finance.InvoiceCreate,
            Permissions.Finance.PaymentApprove,
            Permissions.Construction.ProjectManage,
            Permissions.Property.LeaseManage,
            Permissions.Reports.View,
            Permissions.Users.Manage
        });
    }
}

using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Procurement;

/// <summary>A supplier of materials/services for construction and procurement — intentionally separate from Crm.Customer (a vendor sells to the tenant, a customer buys from it).</summary>
public class Vendor : TenantEntity
{
    public string Name { get; set; } = default!;
    public string? ContactPerson { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }

    /// <summary>Generic optional field for a tax/registration number — jurisdiction-specific formats aren't validated here.</summary>
    public string? TaxRegistrationNumber { get; set; }

    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
}

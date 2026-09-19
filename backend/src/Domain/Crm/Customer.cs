using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Crm;

/// <summary>A converted lead or directly-onboarded customer/contact. The hub other modules (Sales, Property) will link bookings/leases to.</summary>
public class Customer : TenantEntity
{
    public string FullName { get; set; } = default!;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? CompanyName { get; set; }

    /// <summary>Set when this customer originated from a lead conversion (see Lead.ConvertedToCustomerId for the reverse link).</summary>
    public Guid? ConvertedFromLeadId { get; set; }
}

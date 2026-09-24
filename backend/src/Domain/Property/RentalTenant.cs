using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Property;

/// <summary>A rental-side overlay on an existing Crm.Customer — deliberately not a duplicate customer
/// concept. Name/email/phone/address live on Customer; this only adds what's rental-specific.</summary>
public class RentalTenant : TenantEntity
{
    public Guid CustomerId { get; set; }

    public bool IsCompany { get; set; }
    /// <summary>Generic optional identification/registration reference (CNIC, passport, company registration, etc.).</summary>
    public string? IdentificationNumber { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
}

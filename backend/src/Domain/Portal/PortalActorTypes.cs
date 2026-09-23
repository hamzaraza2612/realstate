namespace RealEstateErp.Domain.Portal;

/// <summary>
/// The external-actor kinds a PortalUser can represent. Deliberately excludes "Agent" — an agent/
/// broker in this domain is already an internal AppUser (Booking.SalesAgentUserId), not a distinct
/// external party, so the Agent Portal reuses the existing internal authentication rather than this
/// external-identity model (see docs/PORTAL_ARCHITECTURE.md). Each string doubles as the value stored
/// in PortalUser.ActorType and matches the corresponding Documents.DocumentEntityTypes constant, so a
/// portal actor's own documents/notifications can be looked up with no extra mapping table.
/// </summary>
public static class PortalActorTypes
{
    public const string Customer = "Customer";
    public const string RentalTenant = "RentalTenant";
    public const string PropertyOwner = "PropertyOwner";
    public const string Vendor = "Vendor";
    public const string CoworkingMember = "CoworkingMember";

    public static readonly IReadOnlyCollection<string> All = new[]
    {
        Customer, RentalTenant, PropertyOwner, Vendor, CoworkingMember
    };
}

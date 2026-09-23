using RealEstateErp.Application.Crm.Activities;
using RealEstateErp.Application.Crm.Customers;
using RealEstateErp.Application.Crm.Leads;
using RealEstateErp.Application.Inventory;
using RealEstateErp.Application.Reporting.Sales;
using RealEstateErp.Application.Sales.Bookings;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Portal;

/// <summary>
/// Agent/Broker Portal — deliberately NOT part of the PortalUser/external-identity system above:
/// Booking.SalesAgentUserId already references an internal AppUser (Domain/Sales/Booking.cs's own
/// doc comment says so), and DbSeeder's "Sales Agent" role is an internal-staff role. There is no
/// external, non-staff broker concept anywhere in this domain — inventing one here would be exactly
/// the kind of unnecessary new identity concept Milestone 13 explicitly says not to build. This is a
/// restricted, agent-scoped VIEW over data the caller already has internal access to, reusing the
/// existing internal AppUser session (the caller's own ITenantContext.UserId), not a new login
/// surface. No commission DTO/service exists here: the domain model has no commission-rate or
/// commission-ledger field anywhere to compute one from, so none is fabricated — see
/// docs/PORTAL_ARCHITECTURE.md.
/// </summary>
public interface IAgentPortalService
{
    Task<PagedResult<LeadDto>> ListMyLeadsAsync(PagedRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<CustomerDto>> ListMyCustomersAsync(CancellationToken ct = default);
    Task<PagedResult<InventoryUnitDto>> ListAvailableInventoryAsync(PagedRequest request, CancellationToken ct = default);
    Task<PagedResult<BookingDto>> ListMyBookingsAsync(PagedRequest request, CancellationToken ct = default);
    Task<PagedResult<ActivityDto>> ListMyFollowUpsAsync(PagedRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<SalesByPeriodRowDto>> GetMyPerformanceAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
}

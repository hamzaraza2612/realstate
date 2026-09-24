using RealEstateErp.Application.Documents;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Application.Property.Maintenance;
using RealEstateErp.Application.Reporting.Property;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Portal;

public record OwnerPropertyDto(Guid Id, string Code, string Name, int TotalUnits, int OccupiedUnits, decimal OccupancyRate);

public record OwnerPropertyDetailDto(
    Guid Id, string Code, string Name, string Type, string Status,
    IReadOnlyList<OwnerUnitDto> Units);

public record OwnerUnitDto(Guid Id, string UnitNumber, string Status, string? TenantName, decimal? MarketRentRate);

/// <summary>
/// Owner Portal — deliberately read-only (no create/update actions anywhere in this interface): an
/// owner views performance, they don't administer the ERP. Occupancy/rent-collected/revenue figures
/// are the exact same computations Milestone 12's IPropertyReportService already performs, filtered
/// down to only the properties this owner is linked to — no second reporting implementation.
/// </summary>
public interface IPortalOwnerService
{
    Task<IReadOnlyList<OwnerPropertyDto>> ListPropertiesAsync(CancellationToken ct = default);
    Task<Result<OwnerPropertyDetailDto>> GetPropertyAsync(Guid propertyId, CancellationToken ct = default);

    Task<IReadOnlyList<RentCollectedRowDto>> GetRentCollectedAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<IReadOnlyList<OverdueRentRowDto>> GetOverdueRentAsync(CancellationToken ct = default);
    Task<IReadOnlyList<PropertyRevenueRowDto>> GetRevenueAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);

    Task<PagedResult<MaintenanceRequestDto>> ListMaintenanceRequestsAsync(PagedRequest request, CancellationToken ct = default);

    Task<IReadOnlyList<DocumentDto>> ListDocumentsAsync(CancellationToken ct = default);
    Task<Result<DownloadedFile>> DownloadDocumentAsync(Guid documentId, int? version, CancellationToken ct = default);

    Task<PagedResult<NotificationDto>> ListNotificationsAsync(PagedRequest request, NotificationFilter filter, CancellationToken ct = default);
    Task<int> GetUnreadNotificationCountAsync(CancellationToken ct = default);
    Task<Result<NotificationDto>> MarkNotificationReadAsync(Guid id, CancellationToken ct = default);
    Task MarkAllNotificationsReadAsync(CancellationToken ct = default);
}

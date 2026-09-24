using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Documents;
using RealEstateErp.Domain.Documents;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Application.Portal;
using RealEstateErp.Application.Property.Maintenance;
using RealEstateErp.Application.Reporting.Property;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Portal;

/// <summary>
/// Owner Portal — read-only. Occupancy/rent-collected/overdue-rent/revenue figures reuse
/// IPropertyReportService (Milestone 12) verbatim, filtered down to this owner's own PropertyIds
/// after the call returns — no second reporting implementation, no change to the M12 service.
/// </summary>
public class PortalOwnerService : IPortalOwnerService
{
    private readonly AppDbContext _db;
    private readonly IPortalContext _portalContext;
    private readonly IPropertyReportService _propertyReportService;
    private readonly IMaintenanceService _maintenanceService;
    private readonly IDocumentService _documentService;
    private readonly INotificationService _notificationService;

    public PortalOwnerService(
        AppDbContext db, IPortalContext portalContext, IPropertyReportService propertyReportService,
        IMaintenanceService maintenanceService, IDocumentService documentService, INotificationService notificationService)
    {
        _db = db;
        _portalContext = portalContext;
        _propertyReportService = propertyReportService;
        _maintenanceService = maintenanceService;
        _documentService = documentService;
        _notificationService = notificationService;
    }

    private Guid PropertyOwnerId => _portalContext.ActorId;

    private async Task<List<Guid>> GetOwnedPropertyIdsAsync(CancellationToken ct) =>
        await _db.Properties.Where(p => p.PropertyOwnerId == PropertyOwnerId).Select(p => p.Id).ToListAsync(ct);

    public async Task<IReadOnlyList<OwnerPropertyDto>> ListPropertiesAsync(CancellationToken ct = default)
    {
        var propertyIds = await GetOwnedPropertyIdsAsync(ct);
        if (propertyIds.Count == 0) return [];

        var occupancy = await _propertyReportService.OccupancyAsync(ct);
        var byId = occupancy.Where(o => propertyIds.Contains(o.PropertyId)).ToDictionary(o => o.PropertyId);

        var properties = await _db.Properties.Where(p => propertyIds.Contains(p.Id)).ToListAsync(ct);
        return properties.Select(p =>
        {
            var occ = byId.GetValueOrDefault(p.Id);
            return new OwnerPropertyDto(p.Id, p.Code, p.Name, occ?.TotalUnits ?? 0, occ?.OccupiedUnits ?? 0, occ?.OccupancyRate ?? 0);
        }).OrderBy(p => p.Name).ToList();
    }

    public async Task<Result<OwnerPropertyDetailDto>> GetPropertyAsync(Guid propertyId, CancellationToken ct = default)
    {
        var property = await _db.Properties.FirstOrDefaultAsync(p => p.Id == propertyId && p.PropertyOwnerId == PropertyOwnerId, ct);
        if (property is null) return Result.Failure<OwnerPropertyDetailDto>("Property not found.", "not_found");

        var units = await _db.PropertyUnits.Where(u => u.PropertyId == propertyId).ToListAsync(ct);
        var activeLeases = await _db.Leases
            .Where(l => l.PropertyId == propertyId && l.Status == LeaseStatus.Active)
            .ToListAsync(ct);
        var tenantIds = activeLeases.Select(l => l.RentalTenantId).Distinct().ToList();
        var tenants = await _db.RentalTenants.Where(t => tenantIds.Contains(t.Id)).ToListAsync(ct);
        var customerIds = tenants.Select(t => t.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);
        var tenantNameByUnit = activeLeases
            .Where(l => tenants.Any(t => t.Id == l.RentalTenantId))
            .ToDictionary(l => l.UnitId, l =>
            {
                var tenant = tenants.First(t => t.Id == l.RentalTenantId);
                return customerNames.GetValueOrDefault(tenant.CustomerId, "");
            });

        var unitDtos = units.Select(u => new OwnerUnitDto(
                u.Id, u.UnitNumber, u.Status.ToString(), tenantNameByUnit.GetValueOrDefault(u.Id), u.MarketRentRate))
            .ToList();

        return Result.Success(new OwnerPropertyDetailDto(property.Id, property.Code, property.Name, property.Type.ToString(), property.Status.ToString(), unitDtos));
    }

    public async Task<IReadOnlyList<RentCollectedRowDto>> GetRentCollectedAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var propertyIds = await GetOwnedPropertyIdsAsync(ct);
        var all = await _propertyReportService.RentCollectedAsync(from, to, ct);
        return all.Where(r => propertyIds.Contains(r.PropertyId)).ToList();
    }

    public async Task<IReadOnlyList<OverdueRentRowDto>> GetOverdueRentAsync(CancellationToken ct = default)
    {
        var propertyIds = await GetOwnedPropertyIdsAsync(ct);
        var all = await _propertyReportService.OverdueRentAsync(ct);
        return all.Where(r => propertyIds.Contains(r.PropertyId)).ToList();
    }

    public async Task<IReadOnlyList<PropertyRevenueRowDto>> GetRevenueAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var propertyIds = await GetOwnedPropertyIdsAsync(ct);
        var all = await _propertyReportService.RevenueAsync(from, to, ct);
        return all.Where(r => propertyIds.Contains(r.PropertyId)).ToList();
    }

    public async Task<PagedResult<MaintenanceRequestDto>> ListMaintenanceRequestsAsync(PagedRequest request, CancellationToken ct = default)
    {
        var propertyIds = await GetOwnedPropertyIdsAsync(ct);
        if (propertyIds.Count == 0) return new PagedResult<MaintenanceRequestDto>([], request.Page, request.PageSize, 0);

        // IMaintenanceService.ListAsync filters by a single PropertyId — an owner may have several
        // properties, so aggregate per-property pages here rather than extending the filter to accept
        // a property-id list for what is, for now, a single portal's own read view.
        var all = new List<MaintenanceRequestDto>();
        foreach (var propertyId in propertyIds)
        {
            var page = await _maintenanceService.ListAsync(new PagedRequest { PageSize = 100 }, new MaintenanceRequestFilter(propertyId, null, null, null, null), ct);
            all.AddRange(page.Data);
        }

        var ordered = all.OrderByDescending(m => m.ReportedDate).ToList();
        var total = ordered.Count;
        var pageItems = ordered.Skip(request.Skip).Take(request.PageSize).ToList();
        return new PagedResult<MaintenanceRequestDto>(pageItems, request.Page, request.PageSize, total);
    }

    public async Task<IReadOnlyList<DocumentDto>> ListDocumentsAsync(CancellationToken ct = default)
    {
        var propertyIds = await GetOwnedPropertyIdsAsync(ct);
        var pageAll = new PagedRequest { PageSize = 100 };
        var results = new List<DocumentDto>();

        var ownDocs = await _documentService.ListAsync(pageAll, new DocumentFilter(DocumentEntityTypes.PropertyOwner, PropertyOwnerId, null, null), ct);
        results.AddRange(ownDocs.Data);

        foreach (var propertyId in propertyIds)
        {
            var propertyDocs = await _documentService.ListAsync(pageAll, new DocumentFilter(DocumentEntityTypes.Property, propertyId, null, null), ct);
            results.AddRange(propertyDocs.Data);
        }

        return results;
    }

    public async Task<Result<DownloadedFile>> DownloadDocumentAsync(Guid documentId, int? version, CancellationToken ct = default)
    {
        var detail = await _documentService.GetAsync(documentId, ct);
        if (!detail.Succeeded) return Result.Failure<DownloadedFile>("Document not found.", "not_found");

        var doc = detail.Value!.Document;
        var owns = (doc.EntityType == DocumentEntityTypes.PropertyOwner && doc.EntityId == PropertyOwnerId) ||
                   (doc.EntityType == DocumentEntityTypes.Property && await _db.Properties.AnyAsync(p => p.Id == doc.EntityId && p.PropertyOwnerId == PropertyOwnerId, ct));

        if (!owns) return Result.Failure<DownloadedFile>("Document not found.", "not_found");

        return await _documentService.DownloadAsync(documentId, version, ct);
    }

    public async Task<PagedResult<NotificationDto>> ListNotificationsAsync(PagedRequest request, NotificationFilter filter, CancellationToken ct = default) =>
        await _notificationService.ListAsync(request, filter, ct);

    public async Task<int> GetUnreadNotificationCountAsync(CancellationToken ct = default) =>
        await _notificationService.GetUnreadCountAsync(ct);

    public async Task<Result<NotificationDto>> MarkNotificationReadAsync(Guid id, CancellationToken ct = default) =>
        await _notificationService.MarkReadAsync(id, ct);

    public async Task MarkAllNotificationsReadAsync(CancellationToken ct = default) =>
        await _notificationService.MarkAllReadAsync(ct);
}

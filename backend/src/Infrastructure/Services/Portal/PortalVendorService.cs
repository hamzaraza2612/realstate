using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Documents;
using RealEstateErp.Domain.Documents;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Application.Portal;
using RealEstateErp.Application.Procurement.PurchaseOrders;
using RealEstateErp.Application.Property.Maintenance;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Portal;

public class PortalVendorService : IPortalVendorService
{
    private readonly IPortalContext _portalContext;
    private readonly IPurchaseOrderService _purchaseOrderService;
    private readonly IMaintenanceService _maintenanceService;
    private readonly IDocumentService _documentService;
    private readonly INotificationService _notificationService;

    public PortalVendorService(
        IPortalContext portalContext, IPurchaseOrderService purchaseOrderService,
        IMaintenanceService maintenanceService, IDocumentService documentService, INotificationService notificationService)
    {
        _portalContext = portalContext;
        _purchaseOrderService = purchaseOrderService;
        _maintenanceService = maintenanceService;
        _documentService = documentService;
        _notificationService = notificationService;
    }

    private Guid VendorId => _portalContext.ActorId;

    public async Task<PagedResult<PurchaseOrderDto>> ListPurchaseOrdersAsync(PagedRequest request, CancellationToken ct = default) =>
        await _purchaseOrderService.ListAsync(request, new PurchaseOrderFilter(null, VendorId, null, null), ct);

    public async Task<Result<PurchaseOrderDto>> GetPurchaseOrderAsync(Guid purchaseOrderId, CancellationToken ct = default)
    {
        var result = await _purchaseOrderService.GetAsync(purchaseOrderId, ct);
        if (!result.Succeeded || result.Value!.VendorId != VendorId)
        {
            return Result.Failure<PurchaseOrderDto>("Purchase order not found.", "not_found");
        }
        return result;
    }

    public async Task<PagedResult<MaintenanceRequestDto>> ListAssignedWorkAsync(PagedRequest request, CancellationToken ct = default) =>
        await _maintenanceService.ListAsync(request, new MaintenanceRequestFilter(null, null, null, null, null, null, VendorId), ct);

    public async Task<IReadOnlyList<DocumentDto>> ListDocumentsAsync(CancellationToken ct = default)
    {
        var result = await _documentService.ListAsync(new PagedRequest { PageSize = 100 }, new DocumentFilter(DocumentEntityTypes.Vendor, VendorId, null, null), ct);
        return result.Data;
    }

    public async Task<Result<DownloadedFile>> DownloadDocumentAsync(Guid documentId, int? version, CancellationToken ct = default)
    {
        var detail = await _documentService.GetAsync(documentId, ct);
        if (!detail.Succeeded) return Result.Failure<DownloadedFile>("Document not found.", "not_found");

        var doc = detail.Value!.Document;
        if (doc.EntityType != DocumentEntityTypes.Vendor || doc.EntityId != VendorId)
        {
            return Result.Failure<DownloadedFile>("Document not found.", "not_found");
        }

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

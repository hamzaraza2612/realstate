using RealEstateErp.Application.Documents;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Application.Procurement.PurchaseOrders;
using RealEstateErp.Application.Property.Maintenance;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Portal;

/// <summary>
/// Vendor Portal — a leaner read-only surface (no PO acceptance/negotiation workflow in the current
/// domain model, so none is invented here). Reuses IPurchaseOrderService (filtered to the caller's own
/// VendorId, already a supported filter field — no service change needed) and the Property
/// MaintenanceRequest's AssignedVendorId for "work assigned to me" (the same shared maintenance table
/// Property/Facility maintenance already uses, filtered by vendor instead of by property).
/// </summary>
public interface IPortalVendorService
{
    Task<PagedResult<PurchaseOrderDto>> ListPurchaseOrdersAsync(PagedRequest request, CancellationToken ct = default);
    Task<Result<PurchaseOrderDto>> GetPurchaseOrderAsync(Guid purchaseOrderId, CancellationToken ct = default);

    Task<PagedResult<MaintenanceRequestDto>> ListAssignedWorkAsync(PagedRequest request, CancellationToken ct = default);

    Task<IReadOnlyList<DocumentDto>> ListDocumentsAsync(CancellationToken ct = default);
    Task<Result<DownloadedFile>> DownloadDocumentAsync(Guid documentId, int? version, CancellationToken ct = default);

    Task<PagedResult<NotificationDto>> ListNotificationsAsync(PagedRequest request, NotificationFilter filter, CancellationToken ct = default);
    Task<int> GetUnreadNotificationCountAsync(CancellationToken ct = default);
    Task<Result<NotificationDto>> MarkNotificationReadAsync(Guid id, CancellationToken ct = default);
    Task MarkAllNotificationsReadAsync(CancellationToken ct = default);
}

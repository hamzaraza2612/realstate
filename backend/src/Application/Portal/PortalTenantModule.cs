using RealEstateErp.Application.Documents;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Application.Property.Leases;
using RealEstateErp.Application.Property.Maintenance;
using RealEstateErp.Application.Property.Payments;
using RealEstateErp.Application.Property.RentSchedules;
using RealEstateErp.Application.Property.SecurityDeposits;
using RealEstateErp.Domain.Property;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Portal;

public record TenantPortalPaymentRow(Guid LeaseId, string LeaseNumber, RentPaymentDto Payment);

/// <summary>Tenant can create a maintenance request only against a unit they actually lease (Active or
/// PendingApproval — not a lease that's Expired/Terminated/Cancelled); the property/unit are derived
/// server-side from that lease, never accepted from the client.</summary>
public record CreateTenantMaintenanceRequest(Guid LeaseId, MaintenanceCategory Category, MaintenancePriority Priority, string Description);

/// <summary>
/// Tenant Portal — reuses ILeaseService/IRentScheduleService/IRentPaymentService/ISecurityDepositService/
/// IMaintenanceService exactly as the internal Property module already does; only the RentalTenantId
/// ownership scoping is new.
/// </summary>
public interface IPortalTenantService
{
    Task<PagedResult<LeaseDto>> ListLeasesAsync(PagedRequest request, CancellationToken ct = default);
    Task<Result<LeaseDto>> GetLeaseAsync(Guid leaseId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<RentScheduleDto>>> GetRentScheduleAsync(Guid leaseId, CancellationToken ct = default);
    Task<Result<IReadOnlyList<RentPaymentDto>>> ListPaymentsForLeaseAsync(Guid leaseId, CancellationToken ct = default);
    Task<IReadOnlyList<TenantPortalPaymentRow>> ListAllPaymentsAsync(CancellationToken ct = default);
    Task<Result<SecurityDepositDto>> GetSecurityDepositAsync(Guid leaseId, CancellationToken ct = default);

    Task<PagedResult<MaintenanceRequestDto>> ListMaintenanceRequestsAsync(PagedRequest request, CancellationToken ct = default);
    Task<Result<MaintenanceRequestDto>> CreateMaintenanceRequestAsync(CreateTenantMaintenanceRequest request, CancellationToken ct = default);

    Task<IReadOnlyList<DocumentDto>> ListDocumentsAsync(CancellationToken ct = default);
    Task<Result<DownloadedFile>> DownloadDocumentAsync(Guid documentId, int? version, CancellationToken ct = default);

    Task<PagedResult<NotificationDto>> ListNotificationsAsync(PagedRequest request, NotificationFilter filter, CancellationToken ct = default);
    Task<int> GetUnreadNotificationCountAsync(CancellationToken ct = default);
    Task<Result<NotificationDto>> MarkNotificationReadAsync(Guid id, CancellationToken ct = default);
    Task MarkAllNotificationsReadAsync(CancellationToken ct = default);
}

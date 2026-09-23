using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Documents;
using RealEstateErp.Domain.Documents;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Application.Portal;
using RealEstateErp.Application.Property.Leases;
using RealEstateErp.Application.Property.Maintenance;
using RealEstateErp.Application.Property.Payments;
using RealEstateErp.Application.Property.RentSchedules;
using RealEstateErp.Application.Property.SecurityDeposits;
using RealEstateErp.Domain.Property;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Portal;

public class PortalTenantService : IPortalTenantService
{
    private readonly AppDbContext _db;
    private readonly IPortalContext _portalContext;
    private readonly ILeaseService _leaseService;
    private readonly IRentScheduleService _rentScheduleService;
    private readonly IRentPaymentService _rentPaymentService;
    private readonly ISecurityDepositService _securityDepositService;
    private readonly IMaintenanceService _maintenanceService;
    private readonly IDocumentService _documentService;
    private readonly INotificationService _notificationService;

    public PortalTenantService(
        AppDbContext db, IPortalContext portalContext, ILeaseService leaseService,
        IRentScheduleService rentScheduleService, IRentPaymentService rentPaymentService,
        ISecurityDepositService securityDepositService, IMaintenanceService maintenanceService,
        IDocumentService documentService, INotificationService notificationService)
    {
        _db = db;
        _portalContext = portalContext;
        _leaseService = leaseService;
        _rentScheduleService = rentScheduleService;
        _rentPaymentService = rentPaymentService;
        _securityDepositService = securityDepositService;
        _maintenanceService = maintenanceService;
        _documentService = documentService;
        _notificationService = notificationService;
    }

    private Guid RentalTenantId => _portalContext.ActorId;

    public async Task<PagedResult<LeaseDto>> ListLeasesAsync(PagedRequest request, CancellationToken ct = default) =>
        await _leaseService.ListAsync(request, new LeaseFilter(null, null, RentalTenantId, null, null), ct);

    public async Task<Result<LeaseDto>> GetLeaseAsync(Guid leaseId, CancellationToken ct = default)
    {
        var result = await _leaseService.GetAsync(leaseId, ct);
        if (!result.Succeeded || result.Value!.RentalTenantId != RentalTenantId)
        {
            return Result.Failure<LeaseDto>("Lease not found.", "not_found");
        }
        return result;
    }

    public async Task<Result<IReadOnlyList<RentScheduleDto>>> GetRentScheduleAsync(Guid leaseId, CancellationToken ct = default)
    {
        var ownership = await GetLeaseAsync(leaseId, ct);
        if (!ownership.Succeeded) return Result.Failure<IReadOnlyList<RentScheduleDto>>(ownership.Error!, ownership.ErrorCode!);

        return await _rentScheduleService.ListByLeaseAsync(leaseId, ct);
    }

    public async Task<Result<IReadOnlyList<RentPaymentDto>>> ListPaymentsForLeaseAsync(Guid leaseId, CancellationToken ct = default)
    {
        var ownership = await GetLeaseAsync(leaseId, ct);
        if (!ownership.Succeeded) return Result.Failure<IReadOnlyList<RentPaymentDto>>(ownership.Error!, ownership.ErrorCode!);

        return await _rentPaymentService.ListByLeaseAsync(leaseId, ct);
    }

    public async Task<IReadOnlyList<TenantPortalPaymentRow>> ListAllPaymentsAsync(CancellationToken ct = default)
    {
        var leases = await _db.Leases.Where(l => l.RentalTenantId == RentalTenantId)
            .Select(l => new { l.Id, l.LeaseNumber }).ToListAsync(ct);

        var rows = new List<TenantPortalPaymentRow>();
        foreach (var lease in leases)
        {
            var payments = await _rentPaymentService.ListByLeaseAsync(lease.Id, ct);
            if (payments.Succeeded)
            {
                rows.AddRange(payments.Value!.Select(p => new TenantPortalPaymentRow(lease.Id, lease.LeaseNumber, p)));
            }
        }

        return rows.OrderByDescending(r => r.Payment.PaymentDate).ToList();
    }

    public async Task<Result<SecurityDepositDto>> GetSecurityDepositAsync(Guid leaseId, CancellationToken ct = default)
    {
        var ownership = await GetLeaseAsync(leaseId, ct);
        if (!ownership.Succeeded) return Result.Failure<SecurityDepositDto>(ownership.Error!, ownership.ErrorCode!);

        return await _securityDepositService.GetByLeaseAsync(leaseId, ct);
    }

    public async Task<PagedResult<MaintenanceRequestDto>> ListMaintenanceRequestsAsync(PagedRequest request, CancellationToken ct = default) =>
        await _maintenanceService.ListAsync(request, new MaintenanceRequestFilter(null, null, null, null, null, RentalTenantId), ct);

    public async Task<Result<MaintenanceRequestDto>> CreateMaintenanceRequestAsync(CreateTenantMaintenanceRequest request, CancellationToken ct = default)
    {
        var lease = await _db.Leases.FirstOrDefaultAsync(l => l.Id == request.LeaseId && l.RentalTenantId == RentalTenantId, ct);
        if (lease is null)
        {
            return Result.Failure<MaintenanceRequestDto>("Lease not found.", "not_found");
        }
        if (lease.Status is not (LeaseStatus.Active or LeaseStatus.PendingApproval))
        {
            return Result.Failure<MaintenanceRequestDto>("This lease is no longer active.", "lease_not_active");
        }

        return await _maintenanceService.CreateAsync(new CreateMaintenanceRequestRequest(
            lease.PropertyId, lease.UnitId, null, null, RentalTenantId,
            request.Category, request.Priority, request.Description, DateOnly.FromDateTime(DateTime.UtcNow), null, null, null), ct);
    }

    public async Task<IReadOnlyList<DocumentDto>> ListDocumentsAsync(CancellationToken ct = default)
    {
        var pageAll = new PagedRequest { PageSize = 100 };
        var results = new List<DocumentDto>();

        var ownDocs = await _documentService.ListAsync(pageAll, new DocumentFilter(DocumentEntityTypes.RentalTenant, RentalTenantId, null, null), ct);
        results.AddRange(ownDocs.Data);

        var leaseIds = await _db.Leases.Where(l => l.RentalTenantId == RentalTenantId).Select(l => l.Id).ToListAsync(ct);
        foreach (var leaseId in leaseIds)
        {
            var leaseDocs = await _documentService.ListAsync(pageAll, new DocumentFilter(DocumentEntityTypes.Lease, leaseId, null, null), ct);
            results.AddRange(leaseDocs.Data);
        }

        return results;
    }

    public async Task<Result<DownloadedFile>> DownloadDocumentAsync(Guid documentId, int? version, CancellationToken ct = default)
    {
        var detail = await _documentService.GetAsync(documentId, ct);
        if (!detail.Succeeded) return Result.Failure<DownloadedFile>("Document not found.", "not_found");

        var doc = detail.Value!.Document;
        var owns = (doc.EntityType == DocumentEntityTypes.RentalTenant && doc.EntityId == RentalTenantId) ||
                   (doc.EntityType == DocumentEntityTypes.Lease && await _db.Leases.AnyAsync(l => l.Id == doc.EntityId && l.RentalTenantId == RentalTenantId, ct));

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

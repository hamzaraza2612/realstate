using Microsoft.EntityFrameworkCore;
using Npgsql;
using RealEstateErp.Application.Approvals;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Sales.Bookings;
using RealEstateErp.Domain.Projects;
using RealEstateErp.Domain.Sales;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Infrastructure.Services.Sales;

public class BookingService : IBookingService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;
    private readonly IApprovalService _approvalService;

    public BookingService(AppDbContext db, ITenantContext tenantContext, IAuditLogger auditLogger, IApprovalService approvalService)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
        _approvalService = approvalService;
    }

    public async Task<PagedResult<BookingDto>> ListAsync(PagedRequest request, BookingFilter filter, CancellationToken ct = default)
    {
        var query = _db.Bookings.AsQueryable();

        if (filter.ProjectId.HasValue) query = query.Where(b => b.ProjectId == filter.ProjectId);
        if (filter.CustomerId.HasValue) query = query.Where(b => b.CustomerId == filter.CustomerId);
        if (filter.SalesAgentUserId.HasValue) query = query.Where(b => b.SalesAgentUserId == filter.SalesAgentUserId);
        if (filter.Status.HasValue) query = query.Where(b => b.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(b => b.BookingNumber.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var bookings = await query.OrderByDescending(b => b.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);

        return new PagedResult<BookingDto>(await ToDtosAsync(bookings, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<BookingDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null) return Result.Failure<BookingDto>("Booking not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { booking }, ct))[0]);
    }

    public async Task<Result<BookingDto>> CreateAsync(CreateBookingRequest request, CancellationToken ct = default)
    {
        var customerExists = await _db.Customers.AnyAsync(c => c.Id == request.CustomerId, ct);
        if (!customerExists) return Result.Failure<BookingDto>("Customer not found.", "not_found");

        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == request.ProjectId, ct);
        if (project is null) return Result.Failure<BookingDto>("Project not found.", "not_found");

        var unitCheck = await _db.InventoryUnits.FirstOrDefaultAsync(u => u.Id == request.InventoryUnitId, ct);
        if (unitCheck is null) return Result.Failure<BookingDto>("Inventory unit not found.", "not_found");
        if (unitCheck.ProjectId != request.ProjectId) return Result.Failure<BookingDto>("Inventory unit belongs to a different project.", "invalid_unit");
        if (unitCheck.Status != InventoryStatus.Available) return Result.Failure<BookingDto>("Only available inventory units can be booked.", "unit_not_available");

        var netPrice = request.TotalPrice - request.Discount;

        for (var attempt = 0; attempt < 5; attempt++)
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            var unit = await _db.InventoryUnits.FirstAsync(u => u.Id == request.InventoryUnitId, ct);

            var sequence = await _db.Bookings.CountAsync(ct) + 1 + attempt;
            var booking = new Booking
            {
                BookingNumber = $"BK-{sequence:D6}",
                CustomerId = request.CustomerId,
                ProjectId = request.ProjectId,
                InventoryUnitId = request.InventoryUnitId,
                SalesAgentUserId = request.SalesAgentUserId,
                BookingDate = request.BookingDate,
                Status = BookingStatus.Draft,
                TotalPrice = request.TotalPrice,
                Discount = request.Discount,
                NetPrice = netPrice,
                Notes = request.Notes
            };
            _db.Bookings.Add(booking);
            unit.Status = InventoryStatus.Reserved;

            try
            {
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                await _auditLogger.LogAsync("Create", "Sales", "Booking", booking.Id.ToString(),
                    after: new { booking.BookingNumber, booking.CustomerId, booking.InventoryUnitId, booking.NetPrice }, ct: ct);

                return Result.Success((await ToDtosAsync(new[] { booking }, ct))[0]);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex, "IX_bookings_InventoryUnitId"))
            {
                await transaction.RollbackAsync(ct);
                return Result.Failure<BookingDto>("This inventory unit already has an active booking.", "double_booking");
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex, "IX_bookings_TenantId_BookingNumber"))
            {
                await transaction.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
            }
        }

        return Result.Failure<BookingDto>("Could not generate a unique booking number, please retry.", "conflict");
    }

    public async Task<Result<BookingDto>> UpdateAsync(Guid id, UpdateBookingRequest request, CancellationToken ct = default)
    {
        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null) return Result.Failure<BookingDto>("Booking not found.", "not_found");
        if (booking.Status != BookingStatus.Draft) return Result.Failure<BookingDto>("Only draft bookings can be edited.", "invalid_state");

        var before = new { booking.TotalPrice, booking.Discount };
        booking.SalesAgentUserId = request.SalesAgentUserId;
        booking.BookingDate = request.BookingDate;
        booking.TotalPrice = request.TotalPrice;
        booking.Discount = request.Discount;
        booking.NetPrice = request.TotalPrice - request.Discount;
        booking.Notes = request.Notes;

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Sales", "Booking", booking.Id.ToString(), before,
            new { booking.TotalPrice, booking.Discount }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { booking }, ct))[0]);
    }

    public async Task<Result<BookingDto>> SubmitForApprovalAsync(Guid id, CancellationToken ct = default) =>
        await TransitionAsync(id, BookingStatus.PendingApproval, ct);

    public async Task<Result<BookingDto>> ApproveAsync(Guid id, CancellationToken ct = default)
    {
        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null) return Result.Failure<BookingDto>("Booking not found.", "not_found");
        if (!BookingStatusRules.CanTransition(booking.Status, BookingStatus.Confirmed))
            return Result.Failure<BookingDto>($"Cannot transition booking from {booking.Status} to Confirmed.", "invalid_transition");

        var unit = await _db.InventoryUnits.FirstOrDefaultAsync(u => u.Id == booking.InventoryUnitId, ct);
        if (unit is not null && InventoryStatusRules.CanTransition(unit.Status, InventoryStatus.Booked))
        {
            unit.Status = InventoryStatus.Booked;
        }

        booking.Status = BookingStatus.Confirmed;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Approve", "Sales", "Booking", booking.Id.ToString(),
            new { Status = BookingStatus.PendingApproval }, new { booking.Status }, ct: ct);
        await _approvalService.ResolveForEntityAsync("Booking", booking.Id, approved: true, _tenantContext.UserId ?? Guid.Empty, decisionComments: null, ct);

        return Result.Success((await ToDtosAsync(new[] { booking }, ct))[0]);
    }

    public async Task<Result<BookingDto>> CancelAsync(Guid id, CancellationToken ct = default)
    {
        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null) return Result.Failure<BookingDto>("Booking not found.", "not_found");
        if (!BookingStatusRules.CanTransition(booking.Status, BookingStatus.Cancelled))
            return Result.Failure<BookingDto>($"Cannot cancel a booking that is already {booking.Status}.", "invalid_transition");

        var before = booking.Status;

        var unit = await _db.InventoryUnits.FirstOrDefaultAsync(u => u.Id == booking.InventoryUnitId, ct);
        if (unit is not null && InventoryStatusRules.CanTransition(unit.Status, InventoryStatus.Available))
        {
            unit.Status = InventoryStatus.Available;
        }

        var openInstallments = await _db.Installments
            .Where(i => i.BookingId == booking.Id && i.Status != InstallmentStatus.Paid && i.Status != InstallmentStatus.Cancelled)
            .ToListAsync(ct);
        foreach (var installment in openInstallments)
        {
            installment.Status = InstallmentStatus.Cancelled;
        }

        booking.Status = BookingStatus.Cancelled;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Cancel", "Sales", "Booking", booking.Id.ToString(),
            new { Status = before }, new { booking.Status }, ct: ct);

        if (before == BookingStatus.PendingApproval)
        {
            await _approvalService.ResolveForEntityAsync("Booking", booking.Id, approved: false, _tenantContext.UserId ?? Guid.Empty, decisionComments: null, ct);
        }

        return Result.Success((await ToDtosAsync(new[] { booking }, ct))[0]);
    }

    private async Task<Result<BookingDto>> TransitionAsync(Guid id, BookingStatus target, CancellationToken ct)
    {
        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null) return Result.Failure<BookingDto>("Booking not found.", "not_found");
        if (!BookingStatusRules.CanTransition(booking.Status, target))
            return Result.Failure<BookingDto>($"Cannot transition booking from {booking.Status} to {target}.", "invalid_transition");

        var before = booking.Status;
        booking.Status = target;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Transition", "Sales", "Booking", booking.Id.ToString(),
            new { Status = before }, new { booking.Status }, ct: ct);

        if (target == BookingStatus.PendingApproval)
        {
            await _approvalService.CreateRequestAsync(new CreateApprovalRequestRequest(
                "Booking", booking.Id, ApproverUserId: null, Permissions.Sales.BookingApprove, RequestComments: null), ct);
        }

        return Result.Success((await ToDtosAsync(new[] { booking }, ct))[0]);
    }

    private static bool IsUniqueViolation(DbUpdateException ex, string constraintName) =>
        ex.InnerException is PostgresException { SqlState: "23505" } pg && pg.ConstraintName == constraintName;

    private async Task<List<BookingDto>> ToDtosAsync(IReadOnlyCollection<Booking> bookings, CancellationToken ct)
    {
        var customerIds = bookings.Select(b => b.CustomerId).Distinct().ToList();
        var projectIds = bookings.Select(b => b.ProjectId).Distinct().ToList();
        var unitIds = bookings.Select(b => b.InventoryUnitId).Distinct().ToList();
        var agentIds = bookings.Select(b => b.SalesAgentUserId).Distinct().ToList();
        var bookingIds = bookings.Select(b => b.Id).ToList();

        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);
        var projectNames = await _db.Projects.Where(p => projectIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var unitCodes = await _db.InventoryUnits.Where(u => unitIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.Code, ct);
        var agentNames = await _db.Users.Where(u => agentIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);
        var plansByBooking = await _db.PaymentPlans.Where(p => bookingIds.Contains(p.BookingId)).Select(p => p.BookingId).ToListAsync(ct);
        var plansSet = plansByBooking.ToHashSet();

        return bookings.Select(b => new BookingDto(
            b.Id, b.BookingNumber, b.CustomerId, customerNames.GetValueOrDefault(b.CustomerId, ""),
            b.ProjectId, projectNames.GetValueOrDefault(b.ProjectId, ""),
            b.InventoryUnitId, unitCodes.GetValueOrDefault(b.InventoryUnitId, ""),
            b.SalesAgentUserId, agentNames.GetValueOrDefault(b.SalesAgentUserId),
            b.BookingDate, b.Status, b.TotalPrice, b.Discount, b.NetPrice, b.Notes,
            plansSet.Contains(b.Id), b.CreatedAt, b.UpdatedAt)).ToList();
    }
}

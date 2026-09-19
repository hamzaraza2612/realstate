using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Sales.Dashboard;
using RealEstateErp.Domain.Projects;
using RealEstateErp.Domain.Sales;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Sales;

public class SalesDashboardService : ISalesDashboardService
{
    private readonly AppDbContext _db;

    public SalesDashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<SalesDashboardDto> GetAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var totalBookings = await _db.Bookings.CountAsync(ct);
        var draftBookings = await _db.Bookings.CountAsync(b => b.Status == BookingStatus.Draft, ct);
        var pendingApprovalBookings = await _db.Bookings.CountAsync(b => b.Status == BookingStatus.PendingApproval, ct);
        var confirmedBookings = await _db.Bookings.CountAsync(b => b.Status == BookingStatus.Confirmed, ct);
        var cancelledBookings = await _db.Bookings.CountAsync(b => b.Status == BookingStatus.Cancelled, ct);

        var availableInventory = await _db.InventoryUnits.CountAsync(u => u.Status == InventoryStatus.Available, ct);
        var reservedOrBookedInventory = await _db.InventoryUnits.CountAsync(u =>
            u.Status == InventoryStatus.Reserved || u.Status == InventoryStatus.Booked ||
            u.Status == InventoryStatus.UnderConstruction || u.Status == InventoryStatus.Blocked, ct);
        var soldInventory = await _db.InventoryUnits.CountAsync(u =>
            u.Status == InventoryStatus.Sold || u.Status == InventoryStatus.HandedOver, ct);

        var totalBookingValue = await _db.Bookings.Where(b => b.Status != BookingStatus.Cancelled).SumAsync(b => (decimal?)b.NetPrice, ct) ?? 0m;
        var collectedAmount = await _db.Payments.SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;

        var outstandingInstallments = await _db.Installments
            .Where(i => i.Status != InstallmentStatus.Paid && i.Status != InstallmentStatus.Cancelled)
            .Select(i => new { i.Amount, i.PaidAmount, i.DueDate, i.PaymentPlanId })
            .ToListAsync(ct);
        var outstandingAmount = outstandingInstallments.Sum(i => i.Amount - i.PaidAmount);

        var gracePeriods = await _db.PaymentPlans.Select(p => new { p.Id, p.GracePeriodDays }).ToDictionaryAsync(p => p.Id, p => p.GracePeriodDays, ct);
        var overdueInstallments = outstandingInstallments.Count(i =>
            i.DueDate.AddDays(gracePeriods.GetValueOrDefault(i.PaymentPlanId)) < today);

        var recentBookings = await _db.Bookings.OrderByDescending(b => b.CreatedAt).Take(5).ToListAsync(ct);
        var customerIds = recentBookings.Select(b => b.CustomerId).Distinct().ToList();
        var projectIds = recentBookings.Select(b => b.ProjectId).Distinct().ToList();
        var unitIds = recentBookings.Select(b => b.InventoryUnitId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);
        var projectNames = await _db.Projects.Where(p => projectIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var unitCodes = await _db.InventoryUnits.Where(u => unitIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.Code, ct);

        var recentDtos = recentBookings.Select(b => new RecentBookingDto(
            b.Id, b.BookingNumber, customerNames.GetValueOrDefault(b.CustomerId, ""), projectNames.GetValueOrDefault(b.ProjectId, ""),
            unitCodes.GetValueOrDefault(b.InventoryUnitId, ""), (int)b.Status, b.NetPrice, b.CreatedAt)).ToList();

        return new SalesDashboardDto(
            totalBookings, draftBookings, pendingApprovalBookings, confirmedBookings, cancelledBookings,
            availableInventory, reservedOrBookedInventory, soldInventory,
            totalBookingValue, collectedAmount, outstandingAmount, overdueInstallments, recentDtos);
    }
}

using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Procurement.Dashboard;
using RealEstateErp.Domain.Procurement;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Procurement;

public class ProcurementDashboardService : IProcurementDashboardService
{
    private readonly AppDbContext _db;

    public ProcurementDashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ProcurementDashboardDto> GetAsync(CancellationToken ct = default)
    {
        var pendingApprovals = await _db.PurchaseRequests.CountAsync(r => r.Status == PurchaseRequestStatus.Submitted, ct);
        var totalOrders = await _db.PurchaseOrders.CountAsync(ct);
        var pendingDeliveries = await _db.PurchaseOrders.CountAsync(o => o.Status == PurchaseOrderStatus.Sent, ct);
        var partiallyReceived = await _db.PurchaseOrders.CountAsync(o => o.Status == PurchaseOrderStatus.PartiallyReceived, ct);
        var activeVendors = await _db.Vendors.CountAsync(v => v.IsActive, ct);
        var totalValue = await _db.PurchaseOrders.Where(o => o.Status != PurchaseOrderStatus.Cancelled).SumAsync(o => (decimal?)o.Total, ct) ?? 0m;

        var recentOrders = await _db.PurchaseOrders.OrderByDescending(o => o.CreatedAt).Take(5).ToListAsync(ct);
        var vendorIds = recentOrders.Select(o => o.VendorId).Distinct().ToList();
        var vendorNames = await _db.Vendors.Where(v => vendorIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id, v => v.Name, ct);

        var recentDtos = recentOrders.Select(o => new RecentPurchaseOrderDto(
            o.Id, o.PoNumber, vendorNames.GetValueOrDefault(o.VendorId, ""), (int)o.Status, o.Total, o.CreatedAt)).ToList();

        return new ProcurementDashboardDto(pendingApprovals, totalOrders, pendingDeliveries, partiallyReceived, activeVendors, totalValue, recentDtos);
    }
}

using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Reporting.Procurement;
using RealEstateErp.Domain.Procurement;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Reporting;

public class ProcurementReportService : IProcurementReportService
{
    private static readonly PurchaseOrderStatus[] OpenStatuses =
        [PurchaseOrderStatus.PendingApproval, PurchaseOrderStatus.Approved, PurchaseOrderStatus.Sent, PurchaseOrderStatus.PartiallyReceived];

    private readonly AppDbContext _db;

    public ProcurementReportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<PurchaseOrderExposureRowDto>> PurchaseOrderExposureAsync(CancellationToken ct = default)
    {
        var rows = await _db.PurchaseOrders
            .Where(po => OpenStatuses.Contains(po.Status))
            .GroupBy(po => po.VendorId)
            .Select(g => new { VendorId = g.Key, Count = g.Count(), Total = g.Sum(po => po.Total) })
            .ToListAsync(ct);

        var vendorNames = await _db.Vendors.Where(v => rows.Select(r => r.VendorId).Contains(v.Id))
            .ToDictionaryAsync(v => v.Id, v => v.Name, ct);

        return rows.Select(r => new PurchaseOrderExposureRowDto(r.VendorId, vendorNames.GetValueOrDefault(r.VendorId, ""), r.Count, r.Total))
            .OrderByDescending(r => r.TotalExposure)
            .ToList();
    }

    public async Task<IReadOnlyList<ReceivedVsOrderedRowDto>> ReceivedVsOrderedAsync(Guid? purchaseOrderId, CancellationToken ct = default)
    {
        var query = _db.PurchaseOrderLines.AsQueryable();
        if (purchaseOrderId.HasValue) query = query.Where(l => l.PurchaseOrderId == purchaseOrderId);

        var lines = await query.ToListAsync(ct);
        var poNumbers = await _db.PurchaseOrders.Where(po => lines.Select(l => l.PurchaseOrderId).Contains(po.Id))
            .ToDictionaryAsync(po => po.Id, po => po.PoNumber, ct);

        return lines.Select(l => new ReceivedVsOrderedRowDto(
                l.PurchaseOrderId, poNumbers.GetValueOrDefault(l.PurchaseOrderId, ""), l.ItemDescription,
                l.Quantity, l.ReceivedQuantity, l.Quantity - l.ReceivedQuantity))
            .OrderByDescending(r => r.OutstandingQuantity)
            .ToList();
    }

    public async Task<IReadOnlyList<VendorSpendRowDto>> VendorSpendAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var query = _db.PurchaseOrders.AsQueryable();
        if (from.HasValue) query = query.Where(po => po.OrderDate >= from);
        if (to.HasValue) query = query.Where(po => po.OrderDate <= to);

        var rows = await query
            .GroupBy(po => po.VendorId)
            .Select(g => new { VendorId = g.Key, Count = g.Count(), Total = g.Sum(po => po.Total) })
            .ToListAsync(ct);

        var vendorNames = await _db.Vendors.Where(v => rows.Select(r => r.VendorId).Contains(v.Id))
            .ToDictionaryAsync(v => v.Id, v => v.Name, ct);

        return rows.Select(r => new VendorSpendRowDto(r.VendorId, vendorNames.GetValueOrDefault(r.VendorId, ""), r.Count, r.Total))
            .OrderByDescending(r => r.TotalSpend)
            .ToList();
    }

    public async Task<IReadOnlyList<ProcurementStatusRowDto>> StatusBreakdownAsync(CancellationToken ct = default)
    {
        var rows = await _db.PurchaseOrders
            .GroupBy(po => po.Status)
            .Select(g => new ProcurementStatusRowDto(g.Key, g.Count(), g.Sum(po => po.Total)))
            .ToListAsync(ct);

        return rows.OrderBy(r => r.Status).ToList();
    }
}

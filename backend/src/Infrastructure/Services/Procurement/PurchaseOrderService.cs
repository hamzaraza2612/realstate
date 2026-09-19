using Microsoft.EntityFrameworkCore;
using Npgsql;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Procurement.PurchaseOrders;
using RealEstateErp.Domain.Procurement;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Procurement;

public class PurchaseOrderService : IPurchaseOrderService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public PurchaseOrderService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<PurchaseOrderDto>> ListAsync(PagedRequest request, PurchaseOrderFilter filter, CancellationToken ct = default)
    {
        var query = _db.PurchaseOrders.AsQueryable();
        if (filter.ProjectId.HasValue) query = query.Where(o => o.ProjectId == filter.ProjectId);
        if (filter.VendorId.HasValue) query = query.Where(o => o.VendorId == filter.VendorId);
        if (filter.Status.HasValue) query = query.Where(o => o.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(o => o.PoNumber.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var orders = await query.OrderByDescending(o => o.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<PurchaseOrderDto>(await ToDtosAsync(orders, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<PurchaseOrderDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var po = await _db.PurchaseOrders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (po is null) return Result.Failure<PurchaseOrderDto>("Purchase order not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { po }, ct))[0]);
    }

    public async Task<Result<PurchaseOrderDto>> CreateAsync(CreatePurchaseOrderRequest request, CancellationToken ct = default)
    {
        var vendorExists = await _db.Vendors.AnyAsync(v => v.Id == request.VendorId, ct);
        if (!vendorExists) return Result.Failure<PurchaseOrderDto>("Vendor not found.", "not_found");
        var projectExists = await _db.Projects.AnyAsync(p => p.Id == request.ProjectId, ct);
        if (!projectExists) return Result.Failure<PurchaseOrderDto>("Project not found.", "not_found");

        if (request.PurchaseRequestId.HasValue)
        {
            var pr = await _db.PurchaseRequests.FirstOrDefaultAsync(r => r.Id == request.PurchaseRequestId, ct);
            if (pr is null) return Result.Failure<PurchaseOrderDto>("Purchase request not found.", "not_found");
            if (pr.Status != PurchaseRequestStatus.Approved)
                return Result.Failure<PurchaseOrderDto>("Only approved purchase requests can be converted into a purchase order.", "invalid_state");
        }

        var (subtotal, total) = Calculate(request.Lines, request.Discount, request.TaxAmount);

        for (var attempt = 0; attempt < 5; attempt++)
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);

            var sequence = await _db.PurchaseOrders.CountAsync(ct) + 1 + attempt;
            var po = new PurchaseOrder
            {
                PoNumber = $"PO-{sequence:D6}",
                VendorId = request.VendorId,
                ProjectId = request.ProjectId,
                WorkPackageId = request.WorkPackageId,
                PurchaseRequestId = request.PurchaseRequestId,
                OrderDate = request.OrderDate,
                ExpectedDeliveryDate = request.ExpectedDeliveryDate,
                Status = PurchaseOrderStatus.Draft,
                Subtotal = subtotal,
                Discount = request.Discount,
                TaxAmount = request.TaxAmount,
                Total = total,
                Notes = request.Notes
            };
            _db.PurchaseOrders.Add(po);
            _db.PurchaseOrderLines.AddRange(BuildLines(po.Id, request.Lines));

            try
            {
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
                await _auditLogger.LogAsync("Create", "Procurement", "PurchaseOrder", po.Id.ToString(), after: new { po.PoNumber, po.VendorId, po.Total }, ct: ct);
                return Result.Success((await ToDtosAsync(new[] { po }, ct))[0]);
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
            {
                await transaction.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
            }
        }

        return Result.Failure<PurchaseOrderDto>("Could not generate a unique PO number, please retry.", "conflict");
    }

    public async Task<Result<PurchaseOrderDto>> UpdateAsync(Guid id, UpdatePurchaseOrderRequest request, CancellationToken ct = default)
    {
        var po = await _db.PurchaseOrders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (po is null) return Result.Failure<PurchaseOrderDto>("Purchase order not found.", "not_found");
        if (po.Status != PurchaseOrderStatus.Draft) return Result.Failure<PurchaseOrderDto>("Only draft purchase orders can be edited.", "invalid_state");

        var (subtotal, total) = Calculate(request.Lines, request.Discount, request.TaxAmount);

        po.OrderDate = request.OrderDate;
        po.ExpectedDeliveryDate = request.ExpectedDeliveryDate;
        po.Discount = request.Discount;
        po.TaxAmount = request.TaxAmount;
        po.Subtotal = subtotal;
        po.Total = total;
        po.Notes = request.Notes;

        var existingLines = await _db.PurchaseOrderLines.Where(l => l.PurchaseOrderId == id).ToListAsync(ct);
        _db.PurchaseOrderLines.RemoveRange(existingLines);
        _db.PurchaseOrderLines.AddRange(BuildLines(id, request.Lines));

        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("Update", "Procurement", "PurchaseOrder", po.Id.ToString(), after: new { po.Total }, ct: ct);
        return Result.Success((await ToDtosAsync(new[] { po }, ct))[0]);
    }

    public Task<Result<PurchaseOrderDto>> SubmitAsync(Guid id, CancellationToken ct = default) => TransitionAsync(id, PurchaseOrderStatus.PendingApproval, ct);
    public Task<Result<PurchaseOrderDto>> ApproveAsync(Guid id, CancellationToken ct = default) => TransitionAsync(id, PurchaseOrderStatus.Approved, ct);
    public Task<Result<PurchaseOrderDto>> SendAsync(Guid id, CancellationToken ct = default) => TransitionAsync(id, PurchaseOrderStatus.Sent, ct);
    public Task<Result<PurchaseOrderDto>> CancelAsync(Guid id, CancellationToken ct = default) => TransitionAsync(id, PurchaseOrderStatus.Cancelled, ct);

    private async Task<Result<PurchaseOrderDto>> TransitionAsync(Guid id, PurchaseOrderStatus target, CancellationToken ct)
    {
        var po = await _db.PurchaseOrders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (po is null) return Result.Failure<PurchaseOrderDto>("Purchase order not found.", "not_found");
        if (!PurchaseOrderStatusRules.CanTransition(po.Status, target))
            return Result.Failure<PurchaseOrderDto>($"Cannot transition purchase order from {po.Status} to {target}.", "invalid_transition");

        var before = po.Status;
        po.Status = target;
        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("Transition", "Procurement", "PurchaseOrder", po.Id.ToString(), new { Status = before }, new { po.Status }, ct: ct);
        return Result.Success((await ToDtosAsync(new[] { po }, ct))[0]);
    }

    private static (decimal Subtotal, decimal Total) Calculate(IReadOnlyList<CreatePurchaseOrderLineRequest> lines, decimal discount, decimal taxAmount)
    {
        var subtotal = Math.Round(lines.Sum(l => l.Quantity * l.UnitPrice), 2);
        var total = subtotal - discount + taxAmount;
        return (subtotal, total);
    }

    private static List<PurchaseOrderLine> BuildLines(Guid purchaseOrderId, IReadOnlyList<CreatePurchaseOrderLineRequest> lines) =>
        lines.Select(l => new PurchaseOrderLine
        {
            PurchaseOrderId = purchaseOrderId,
            MaterialId = l.MaterialId,
            ItemDescription = l.ItemDescription,
            UnitOfMeasure = l.UnitOfMeasure,
            Quantity = l.Quantity,
            UnitPrice = l.UnitPrice,
            Total = Math.Round(l.Quantity * l.UnitPrice, 2),
            ReceivedQuantity = 0
        }).ToList();

    private async Task<List<PurchaseOrderDto>> ToDtosAsync(IReadOnlyCollection<PurchaseOrder> orders, CancellationToken ct)
    {
        var ids = orders.Select(o => o.Id).ToList();
        var lines = await _db.PurchaseOrderLines.Where(l => ids.Contains(l.PurchaseOrderId)).ToListAsync(ct);
        var vendorIds = orders.Select(o => o.VendorId).Distinct().ToList();
        var vendorNames = await _db.Vendors.Where(v => vendorIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id, v => v.Name, ct);
        var projectIds = orders.Select(o => o.ProjectId).Distinct().ToList();
        var projectNames = await _db.Projects.Where(p => projectIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var wpIds = orders.Where(o => o.WorkPackageId.HasValue).Select(o => o.WorkPackageId!.Value).Distinct().ToList();
        var wpNames = await _db.WorkPackages.Where(w => wpIds.Contains(w.Id)).ToDictionaryAsync(w => w.Id, w => w.Name, ct);
        var prIds = orders.Where(o => o.PurchaseRequestId.HasValue).Select(o => o.PurchaseRequestId!.Value).Distinct().ToList();
        var prNumbers = await _db.PurchaseRequests.Where(r => prIds.Contains(r.Id)).ToDictionaryAsync(r => r.Id, r => r.RequestNumber, ct);

        return orders.Select(o =>
        {
            var poLines = lines.Where(l => l.PurchaseOrderId == o.Id)
                .Select(l => new PurchaseOrderLineDto(l.Id, l.MaterialId, l.ItemDescription, l.UnitOfMeasure, l.Quantity, l.UnitPrice, l.Total, l.ReceivedQuantity, l.Quantity - l.ReceivedQuantity))
                .ToList();
            return new PurchaseOrderDto(
                o.Id, o.PoNumber, o.VendorId, vendorNames.GetValueOrDefault(o.VendorId, ""), o.ProjectId, projectNames.GetValueOrDefault(o.ProjectId, ""),
                o.WorkPackageId, o.WorkPackageId.HasValue ? wpNames.GetValueOrDefault(o.WorkPackageId.Value) : null,
                o.PurchaseRequestId, o.PurchaseRequestId.HasValue ? prNumbers.GetValueOrDefault(o.PurchaseRequestId.Value) : null,
                o.OrderDate, o.ExpectedDeliveryDate, o.Status, o.Subtotal, o.Discount, o.TaxAmount, o.Total, o.Notes,
                poLines, o.CreatedAt, o.UpdatedAt);
        }).ToList();
    }
}

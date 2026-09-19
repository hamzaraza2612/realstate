using Microsoft.EntityFrameworkCore;
using Npgsql;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Procurement.Receiving;
using RealEstateErp.Domain.Materials;
using RealEstateErp.Domain.Procurement;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Procurement;

public class ReceiptService : IReceiptService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;

    public ReceiptService(AppDbContext db, ITenantContext tenantContext, IAuditLogger auditLogger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
    }

    public async Task<Result<IReadOnlyList<MaterialReceiptDto>>> ListByPurchaseOrderAsync(Guid purchaseOrderId, CancellationToken ct = default)
    {
        var exists = await _db.PurchaseOrders.AnyAsync(o => o.Id == purchaseOrderId, ct);
        if (!exists) return Result.Failure<IReadOnlyList<MaterialReceiptDto>>("Purchase order not found.", "not_found");

        var receipts = await _db.MaterialReceipts.Where(r => r.PurchaseOrderId == purchaseOrderId).OrderByDescending(r => r.CreatedAt).ToListAsync(ct);
        return Result.Success<IReadOnlyList<MaterialReceiptDto>>(await ToDtosAsync(receipts, ct));
    }

    public async Task<Result<MaterialReceiptDto>> CreateAsync(Guid purchaseOrderId, CreateMaterialReceiptRequest request, CancellationToken ct = default)
    {
        var po = await _db.PurchaseOrders.FirstOrDefaultAsync(o => o.Id == purchaseOrderId, ct);
        if (po is null) return Result.Failure<MaterialReceiptDto>("Purchase order not found.", "not_found");
        if (po.Status is not (PurchaseOrderStatus.Approved or PurchaseOrderStatus.Sent or PurchaseOrderStatus.PartiallyReceived))
            return Result.Failure<MaterialReceiptDto>($"Cannot receive against a purchase order in {po.Status} status.", "invalid_state");

        var lineIds = request.Lines.Select(l => l.PurchaseOrderLineId).ToList();
        var poLines = await _db.PurchaseOrderLines.Where(l => lineIds.Contains(l.Id) && l.PurchaseOrderId == purchaseOrderId).ToListAsync(ct);
        if (poLines.Count != lineIds.Distinct().Count())
            return Result.Failure<MaterialReceiptDto>("One or more lines do not belong to this purchase order.", "not_found");

        foreach (var lineRequest in request.Lines)
        {
            var poLine = poLines.First(l => l.Id == lineRequest.PurchaseOrderLineId);
            var outstanding = poLine.Quantity - poLine.ReceivedQuantity;
            if (lineRequest.ReceivedQuantity > outstanding)
            {
                return Result.Failure<MaterialReceiptDto>(
                    $"Cannot receive {lineRequest.ReceivedQuantity} of \"{poLine.ItemDescription}\" — only {outstanding} remains outstanding.", "over_receiving");
            }
        }

        for (var attempt = 0; attempt < 5; attempt++)
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);

            var sequence = await _db.MaterialReceipts.CountAsync(ct) + 1 + attempt;
            var receipt = new MaterialReceipt
            {
                ReceiptNumber = $"GRN-{sequence:D6}",
                PurchaseOrderId = purchaseOrderId,
                VendorId = po.VendorId,
                ReceivedDate = request.ReceivedDate,
                ReceivedByUserId = _tenantContext.UserId ?? Guid.Empty,
                Notes = request.Notes
            };
            _db.MaterialReceipts.Add(receipt);

            foreach (var lineRequest in request.Lines)
            {
                var poLine = poLines.First(l => l.Id == lineRequest.PurchaseOrderLineId);
                _db.MaterialReceiptLines.Add(new MaterialReceiptLine
                {
                    MaterialReceiptId = receipt.Id,
                    PurchaseOrderLineId = poLine.Id,
                    ReceivedQuantity = lineRequest.ReceivedQuantity
                });
                poLine.ReceivedQuantity += lineRequest.ReceivedQuantity;

                if (poLine.MaterialId.HasValue)
                {
                    var material = await _db.Materials.FirstOrDefaultAsync(m => m.Id == poLine.MaterialId, ct);
                    if (material is not null)
                    {
                        material.CurrentQuantity += lineRequest.ReceivedQuantity;
                        _db.StockMovements.Add(new StockMovement
                        {
                            MaterialId = material.Id,
                            Type = StockMovementType.Receipt,
                            Quantity = lineRequest.ReceivedQuantity,
                            ReferenceType = "MaterialReceipt",
                            ReferenceId = receipt.Id,
                            Notes = $"Received against {po.PoNumber}"
                        });
                    }
                }
            }

            var allReceived = poLines.All(l => l.ReceivedQuantity >= l.Quantity);
            var targetStatus = allReceived ? PurchaseOrderStatus.Received : PurchaseOrderStatus.PartiallyReceived;
            if (PurchaseOrderStatusRules.CanTransition(po.Status, targetStatus))
            {
                po.Status = targetStatus;
            }

            try
            {
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                await _auditLogger.LogAsync("Create", "Procurement", "MaterialReceipt", receipt.Id.ToString(),
                    after: new { receipt.ReceiptNumber, po.PoNumber, LineCount = request.Lines.Count }, ct: ct);

                return Result.Success((await ToDtosAsync(new[] { receipt }, ct))[0]);
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
            {
                await transaction.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23514", ConstraintName: "CK_purchase_order_lines_received_not_exceed_ordered" })
            {
                await transaction.RollbackAsync(ct);
                return Result.Failure<MaterialReceiptDto>("This quantity would exceed what remains outstanding on the purchase order.", "over_receiving");
            }
        }

        return Result.Failure<MaterialReceiptDto>("Could not generate a unique receipt number, please retry.", "conflict");
    }

    private async Task<List<MaterialReceiptDto>> ToDtosAsync(IReadOnlyCollection<MaterialReceipt> receipts, CancellationToken ct)
    {
        var ids = receipts.Select(r => r.Id).ToList();
        var lines = await _db.MaterialReceiptLines.Where(l => ids.Contains(l.MaterialReceiptId)).ToListAsync(ct);
        var poLineIds = lines.Select(l => l.PurchaseOrderLineId).Distinct().ToList();
        var poLines = await _db.PurchaseOrderLines.Where(l => poLineIds.Contains(l.Id)).ToDictionaryAsync(l => l.Id, ct);
        var poIds = receipts.Select(r => r.PurchaseOrderId).Distinct().ToList();
        var poNumbers = await _db.PurchaseOrders.Where(o => poIds.Contains(o.Id)).ToDictionaryAsync(o => o.Id, o => o.PoNumber, ct);
        var vendorIds = receipts.Select(r => r.VendorId).Distinct().ToList();
        var vendorNames = await _db.Vendors.Where(v => vendorIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id, v => v.Name, ct);
        var userIds = receipts.Select(r => r.ReceivedByUserId).Distinct().ToList();
        var userNames = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        return receipts.Select(r =>
        {
            var receiptLines = lines.Where(l => l.MaterialReceiptId == r.Id)
                .Select(l => new MaterialReceiptLineDto(l.Id, l.PurchaseOrderLineId,
                    poLines.TryGetValue(l.PurchaseOrderLineId, out var poLine) ? poLine.ItemDescription : "", l.ReceivedQuantity))
                .ToList();
            return new MaterialReceiptDto(
                r.Id, r.ReceiptNumber, r.PurchaseOrderId, poNumbers.GetValueOrDefault(r.PurchaseOrderId, ""),
                r.VendorId, vendorNames.GetValueOrDefault(r.VendorId, ""), r.ReceivedDate, r.ReceivedByUserId,
                userNames.GetValueOrDefault(r.ReceivedByUserId), r.Notes, receiptLines, r.CreatedAt);
        }).ToList();
    }
}

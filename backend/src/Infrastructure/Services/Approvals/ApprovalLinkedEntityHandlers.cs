using RealEstateErp.Application.Approvals;
using RealEstateErp.Application.Construction.Expenses;
using RealEstateErp.Application.Procurement.PurchaseOrders;
using RealEstateErp.Application.Sales.Bookings;

namespace RealEstateErp.Infrastructure.Services.Approvals;

/// <summary>
/// The three "prefer" integrations (Expense/PurchaseOrder/Booking): each just calls the module's own,
/// already-existing approve/reject method. If that call fails (a data-consistency edge case — the
/// entity should always still be in its own Pending/PendingApproval state here, since ApprovalService
/// only dispatches when the linked ApprovalRequest was itself still Pending), it fails silently rather
/// than surfacing a second error on top of the approval decision that already committed successfully.
/// </summary>
public class ExpenseApprovalHandler : IApprovalLinkedEntityHandler
{
    private readonly IExpenseService _expenseService;
    public ExpenseApprovalHandler(IExpenseService expenseService) => _expenseService = expenseService;

    public string EntityType => "Expense";

    public async Task ApplyDecisionAsync(Guid entityId, bool approved, CancellationToken ct)
    {
        if (approved) await _expenseService.ApproveAsync(entityId, ct);
        else await _expenseService.RejectAsync(entityId, ct);
    }
}

public class PurchaseOrderApprovalHandler : IApprovalLinkedEntityHandler
{
    private readonly IPurchaseOrderService _purchaseOrderService;
    public PurchaseOrderApprovalHandler(IPurchaseOrderService purchaseOrderService) => _purchaseOrderService = purchaseOrderService;

    public string EntityType => "PurchaseOrder";

    public async Task ApplyDecisionAsync(Guid entityId, bool approved, CancellationToken ct)
    {
        if (approved) await _purchaseOrderService.ApproveAsync(entityId, ct);
        else await _purchaseOrderService.CancelAsync(entityId, ct);
    }
}

public class BookingApprovalHandler : IApprovalLinkedEntityHandler
{
    private readonly IBookingService _bookingService;
    public BookingApprovalHandler(IBookingService bookingService) => _bookingService = bookingService;

    public string EntityType => "Booking";

    public async Task ApplyDecisionAsync(Guid entityId, bool approved, CancellationToken ct)
    {
        if (approved) await _bookingService.ApproveAsync(entityId, ct);
        else await _bookingService.CancelAsync(entityId, ct);
    }
}

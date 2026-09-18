using RealEstateErp.Domain.Sales;

namespace RealEstateErp.Application.Finance.Receivables;

/// <summary>
/// A projection over Sales installments — deliberately not its own table. The installment schedule
/// (Milestone 4) is already the source of truth for what's owed and by when; this just reshapes it
/// for a finance-facing view (by customer, with an outstanding/overdue lens) instead of duplicating it.
/// </summary>
public record ReceivableDto(
    Guid BookingId,
    string BookingNumber,
    Guid CustomerId,
    string CustomerName,
    Guid InstallmentId,
    string Reference,
    decimal Amount,
    decimal PaidAmount,
    decimal OutstandingAmount,
    DateOnly DueDate,
    InstallmentStatus Status);

public record ReceivableFilter(Guid? CustomerId, InstallmentStatus? Status, bool? OverdueOnly, string? Search);

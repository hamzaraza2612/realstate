using RealEstateErp.Domain.Construction;

namespace RealEstateErp.Application.Construction.Expenses;

public record ExpenseDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid? WorkPackageId,
    string? WorkPackageName,
    ExpenseCategory Category,
    decimal Amount,
    DateOnly ExpenseDate,
    Guid? VendorId,
    string? VendorName,
    string? ReferenceNumber,
    string? Notes,
    ExpenseStatus Status,
    Guid? JournalEntryId,
    decimal PaidAmount,
    DateTimeOffset CreatedAt);

public record ExpensePaymentDto(
    Guid Id,
    string ReceiptNumber,
    Guid ExpenseId,
    decimal Amount,
    DateOnly PaymentDate,
    string? ReferenceNumber,
    string? Notes,
    Guid RecordedByUserId,
    string? RecordedByUserName,
    Guid? JournalEntryId,
    DateTimeOffset CreatedAt);

public record PayExpenseRequest(decimal Amount, DateOnly PaymentDate, string? ReferenceNumber, string? Notes, string? IdempotencyKey);

public record CreateExpenseRequest(
    Guid ProjectId,
    Guid? WorkPackageId,
    ExpenseCategory Category,
    decimal Amount,
    DateOnly ExpenseDate,
    Guid? VendorId,
    string? ReferenceNumber,
    string? Notes);

public record ExpenseFilter(Guid? ProjectId, Guid? WorkPackageId, ExpenseStatus? Status, ExpenseCategory? Category);

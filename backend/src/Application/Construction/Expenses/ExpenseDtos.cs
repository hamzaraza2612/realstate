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
    DateTimeOffset CreatedAt);

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

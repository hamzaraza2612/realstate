using RealEstateErp.Domain.Finance;

namespace RealEstateErp.Application.Finance.Accounts;

public record AccountDto(
    Guid Id,
    string Code,
    string Name,
    AccountType Type,
    Guid? ParentAccountId,
    string? ParentAccountName,
    bool IsActive,
    bool IsSystem,
    decimal Balance,
    int ChildAccountCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreateAccountRequest(string Code, string Name, AccountType Type, Guid? ParentAccountId);

public record UpdateAccountRequest(string Name, Guid? ParentAccountId, bool IsActive);

public record AccountFilter(AccountType? Type, bool? IsActive, string? Search);

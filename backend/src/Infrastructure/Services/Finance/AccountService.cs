using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Finance.Accounts;
using RealEstateErp.Domain.Finance;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Finance;

public class AccountService : IAccountService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public AccountService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<AccountDto>> ListAsync(PagedRequest request, AccountFilter filter, CancellationToken ct = default)
    {
        var query = _db.Accounts.AsQueryable();

        if (filter.Type.HasValue) query = query.Where(a => a.Type == filter.Type);
        if (filter.IsActive.HasValue) query = query.Where(a => a.IsActive == filter.IsActive);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(a => a.Name.ToLower().Contains(s) || a.Code.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var accounts = await query.OrderBy(a => a.Code).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);

        return new PagedResult<AccountDto>(await ToDtosAsync(accounts, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<AccountDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (account is null) return Result.Failure<AccountDto>("Account not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { account }, ct))[0]);
    }

    public async Task<Result<AccountDto>> CreateAsync(CreateAccountRequest request, CancellationToken ct = default)
    {
        var codeExists = await _db.Accounts.AnyAsync(a => a.Code == request.Code, ct);
        if (codeExists) return Result.Failure<AccountDto>("An account with this code already exists.", "duplicate_code");

        if (request.ParentAccountId.HasValue)
        {
            var parentExists = await _db.Accounts.AnyAsync(a => a.Id == request.ParentAccountId, ct);
            if (!parentExists) return Result.Failure<AccountDto>("Parent account not found.", "not_found");
        }

        var account = new Account
        {
            Code = request.Code,
            Name = request.Name,
            Type = request.Type,
            ParentAccountId = request.ParentAccountId,
            IsActive = true,
            IsSystem = false
        };

        _db.Accounts.Add(account);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Finance", "Account", account.Id.ToString(),
            after: new { account.Code, account.Name, account.Type }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { account }, ct))[0]);
    }

    public async Task<Result<AccountDto>> UpdateAsync(Guid id, UpdateAccountRequest request, CancellationToken ct = default)
    {
        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (account is null) return Result.Failure<AccountDto>("Account not found.", "not_found");

        if (request.ParentAccountId.HasValue)
        {
            if (request.ParentAccountId == account.Id)
                return Result.Failure<AccountDto>("An account cannot be its own parent.", "invalid_hierarchy");

            var parent = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == request.ParentAccountId, ct);
            if (parent is null) return Result.Failure<AccountDto>("Parent account not found.", "not_found");

            if (await IsDescendantAsync(account.Id, request.ParentAccountId.Value, ct))
                return Result.Failure<AccountDto>("This would create a circular account hierarchy.", "invalid_hierarchy");
        }

        var before = new { account.Name, account.ParentAccountId, account.IsActive };
        account.Name = request.Name;
        account.ParentAccountId = request.ParentAccountId;
        account.IsActive = account.IsSystem ? account.IsActive : request.IsActive;

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Finance", "Account", account.Id.ToString(), before,
            new { account.Name, account.ParentAccountId, account.IsActive }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { account }, ct))[0]);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (account is null) return Result.Failure("Account not found.", "not_found");
        if (account.IsSystem) return Result.Failure("System accounts cannot be deleted.", "conflict");

        var hasChildren = await _db.Accounts.AnyAsync(a => a.ParentAccountId == id, ct);
        var hasJournalLines = await _db.JournalLines.AnyAsync(l => l.AccountId == id, ct);
        if (hasChildren || hasJournalLines)
            return Result.Failure("Cannot delete an account that has child accounts or journal activity.", "conflict");

        _db.Accounts.Remove(account);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Delete", "Finance", "Account", id.ToString(), before: new { account.Code, account.Name }, ct: ct);

        return Result.Success();
    }

    /// <summary>Walks up from <paramref name="candidateParentId"/> to see if it (or any of its ancestors) is <paramref name="accountId"/> — i.e. whether adopting it as a parent would create a cycle.</summary>
    private async Task<bool> IsDescendantAsync(Guid accountId, Guid candidateParentId, CancellationToken ct)
    {
        var current = (Guid?)candidateParentId;
        var visited = new HashSet<Guid>();
        while (current.HasValue && visited.Add(current.Value))
        {
            if (current.Value == accountId) return true;
            current = await _db.Accounts.Where(a => a.Id == current.Value).Select(a => a.ParentAccountId).FirstOrDefaultAsync(ct);
        }
        return false;
    }

    private async Task<List<AccountDto>> ToDtosAsync(IReadOnlyCollection<Account> accounts, CancellationToken ct)
    {
        var allAccounts = await _db.Accounts.ToListAsync(ct);
        var accountsById = allAccounts.ToDictionary(a => a.Id);
        var childCounts = allAccounts.Where(a => a.ParentAccountId.HasValue)
            .GroupBy(a => a.ParentAccountId!.Value).ToDictionary(g => g.Key, g => g.Count());

        var accountIds = accounts.Select(a => a.Id).ToList();
        var balances = await (
                from line in _db.JournalLines
                join entry in _db.JournalEntries on line.JournalEntryId equals entry.Id
                where accountIds.Contains(line.AccountId) && entry.Status == JournalEntryStatus.Posted
                group line by line.AccountId into g
                select new { AccountId = g.Key, Debit = g.Sum(l => l.Debit), Credit = g.Sum(l => l.Credit) })
            .ToDictionaryAsync(x => x.AccountId, x => x, ct);

        return accounts.Select(a =>
        {
            var normalDebitBalance = a.Type is AccountType.Asset or AccountType.Expense;
            var movement = balances.GetValueOrDefault(a.Id);
            var balance = movement is null ? 0m : normalDebitBalance ? movement.Debit - movement.Credit : movement.Credit - movement.Debit;

            return new AccountDto(
                a.Id, a.Code, a.Name, a.Type, a.ParentAccountId,
                a.ParentAccountId.HasValue && accountsById.TryGetValue(a.ParentAccountId.Value, out var parent) ? parent.Name : null,
                a.IsActive, a.IsSystem, balance, childCounts.GetValueOrDefault(a.Id), a.CreatedAt, a.UpdatedAt);
        }).ToList();
    }
}

using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Finance.Journal;
using RealEstateErp.Domain.Finance;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Finance;

public class JournalService : IJournalService
{
    private const decimal Tolerance = 0.01m;

    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public JournalService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<JournalEntryDto>> ListAsync(PagedRequest request, JournalEntryFilter filter, CancellationToken ct = default)
    {
        var query = _db.JournalEntries.AsQueryable();

        if (filter.Status.HasValue) query = query.Where(j => j.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.ReferenceType)) query = query.Where(j => j.ReferenceType == filter.ReferenceType);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(j => j.EntryNumber.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var entries = await query.OrderByDescending(j => j.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);

        return new PagedResult<JournalEntryDto>(await ToDtosAsync(entries, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<JournalEntryDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var entry = await _db.JournalEntries.FirstOrDefaultAsync(j => j.Id == id, ct);
        if (entry is null) return Result.Failure<JournalEntryDto>("Journal entry not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { entry }, ct))[0]);
    }

    public async Task<Result<JournalEntryDto>> CreateAsync(CreateJournalEntryRequest request, CancellationToken ct = default)
    {
        var accountIds = request.Lines.Select(l => l.AccountId).Distinct().ToList();
        var validAccountIds = (await _db.Accounts.Where(a => accountIds.Contains(a.Id)).Select(a => a.Id).ToListAsync(ct)).ToHashSet();
        var missing = accountIds.Except(validAccountIds).ToList();
        if (missing.Count > 0) return Result.Failure<JournalEntryDto>("One or more accounts were not found.", "not_found");

        var totalDebit = request.Lines.Sum(l => l.Debit);
        var totalCredit = request.Lines.Sum(l => l.Credit);
        if (Math.Abs(totalDebit - totalCredit) > Tolerance)
            return Result.Failure<JournalEntryDto>($"Total debits ({totalDebit:0.00}) must equal total credits ({totalCredit:0.00}).", "unbalanced");

        if (await FiscalPeriodGuard.IsClosedAsync(_db, request.EntryDate, ct))
            return Result.Failure<JournalEntryDto>($"The fiscal period covering {request.EntryDate:yyyy-MM-dd} is closed.", "period_closed");

        var sequence = await _db.JournalEntries.CountAsync(ct) + 1;
        var entry = new JournalEntry
        {
            EntryNumber = $"JE-{sequence:D6}",
            EntryDate = request.EntryDate,
            Description = request.Description,
            ReferenceType = "Manual",
            ReferenceId = null,
            Status = JournalEntryStatus.Draft
        };
        _db.JournalEntries.Add(entry);
        _db.JournalLines.AddRange(request.Lines.Select(l => new JournalLine
        {
            JournalEntryId = entry.Id,
            AccountId = l.AccountId,
            Debit = l.Debit,
            Credit = l.Credit,
            Description = l.Description
        }));

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Finance", "JournalEntry", entry.Id.ToString(),
            after: new { entry.EntryNumber, TotalDebit = totalDebit, TotalCredit = totalCredit }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { entry }, ct))[0]);
    }

    public async Task<Result<JournalEntryDto>> PostAsync(Guid id, CancellationToken ct = default)
    {
        var entry = await _db.JournalEntries.FirstOrDefaultAsync(j => j.Id == id, ct);
        if (entry is null) return Result.Failure<JournalEntryDto>("Journal entry not found.", "not_found");
        if (entry.Status != JournalEntryStatus.Draft)
            return Result.Failure<JournalEntryDto>("Only draft journal entries can be posted.", "invalid_state");

        var lines = await _db.JournalLines.Where(l => l.JournalEntryId == id).ToListAsync(ct);
        var totalDebit = lines.Sum(l => l.Debit);
        var totalCredit = lines.Sum(l => l.Credit);
        if (Math.Abs(totalDebit - totalCredit) > Tolerance)
            return Result.Failure<JournalEntryDto>($"Total debits ({totalDebit:0.00}) must equal total credits ({totalCredit:0.00}).", "unbalanced");

        entry.Status = JournalEntryStatus.Posted;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Post", "Finance", "JournalEntry", entry.Id.ToString(),
            new { Status = JournalEntryStatus.Draft }, new { entry.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { entry }, ct))[0]);
    }

    public async Task<Result<JournalEntryDto>> CancelAsync(Guid id, CancellationToken ct = default)
    {
        var entry = await _db.JournalEntries.FirstOrDefaultAsync(j => j.Id == id, ct);
        if (entry is null) return Result.Failure<JournalEntryDto>("Journal entry not found.", "not_found");
        if (entry.Status != JournalEntryStatus.Draft)
            return Result.Failure<JournalEntryDto>("Only draft journal entries can be cancelled — posted entries are immutable.", "invalid_state");

        entry.Status = JournalEntryStatus.Cancelled;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Cancel", "Finance", "JournalEntry", entry.Id.ToString(),
            new { Status = JournalEntryStatus.Draft }, new { entry.Status }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { entry }, ct))[0]);
    }

    public async Task<Result<JournalEntryDto>> ReverseAsync(Guid id, ReverseJournalEntryRequest request, CancellationToken ct = default)
    {
        var original = await _db.JournalEntries.FirstOrDefaultAsync(j => j.Id == id, ct);
        if (original is null) return Result.Failure<JournalEntryDto>("Journal entry not found.", "not_found");
        if (original.Status != JournalEntryStatus.Posted)
            return Result.Failure<JournalEntryDto>("Only posted journal entries can be reversed.", "invalid_state");
        if (original.IsReversed)
            return Result.Failure<JournalEntryDto>("This journal entry has already been reversed.", "already_reversed");

        var reversalDate = request.ReversalDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        if (await FiscalPeriodGuard.IsClosedAsync(_db, reversalDate, ct))
            return Result.Failure<JournalEntryDto>($"The fiscal period covering {reversalDate:yyyy-MM-dd} is closed.", "period_closed");

        var originalLines = await _db.JournalLines.Where(l => l.JournalEntryId == original.Id).ToListAsync(ct);

        var sequence = await _db.JournalEntries.CountAsync(ct) + 1;
        var reversal = new JournalEntry
        {
            EntryNumber = $"JE-{sequence:D6}",
            EntryDate = reversalDate,
            Description = string.IsNullOrWhiteSpace(request.Reason)
                ? $"Reversal of {original.EntryNumber}"
                : $"Reversal of {original.EntryNumber}: {request.Reason}",
            ReferenceType = "Reversal",
            ReferenceId = original.Id,
            ReversalOfEntryId = original.Id,
            Status = JournalEntryStatus.Posted
        };
        _db.JournalEntries.Add(reversal);
        _db.JournalLines.AddRange(originalLines.Select(l => new JournalLine
        {
            JournalEntryId = reversal.Id,
            AccountId = l.AccountId,
            Debit = l.Credit,
            Credit = l.Debit,
            Description = l.Description
        }));

        original.IsReversed = true;

        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Reverse", "Finance", "JournalEntry", original.Id.ToString(),
            after: new { ReversalEntryId = reversal.Id, reversal.EntryNumber, request.Reason }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { reversal }, ct))[0]);
    }

    private async Task<List<JournalEntryDto>> ToDtosAsync(IReadOnlyCollection<JournalEntry> entries, CancellationToken ct)
    {
        var entryIds = entries.Select(e => e.Id).ToList();
        var lines = await _db.JournalLines.Where(l => entryIds.Contains(l.JournalEntryId)).ToListAsync(ct);
        var accountIds = lines.Select(l => l.AccountId).Distinct().ToList();
        var accounts = await _db.Accounts.Where(a => accountIds.Contains(a.Id)).ToDictionaryAsync(a => a.Id, ct);
        var creatorIds = entries.Where(e => e.CreatedBy.HasValue).Select(e => e.CreatedBy!.Value).Distinct().ToList();
        var creatorNames = await _db.Users.Where(u => creatorIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        return entries.Select(e =>
        {
            var entryLines = lines.Where(l => l.JournalEntryId == e.Id)
                .Select(l => new JournalLineDto(
                    l.Id, l.AccountId,
                    accounts.TryGetValue(l.AccountId, out var acc) ? acc.Code : "",
                    accounts.TryGetValue(l.AccountId, out var acc2) ? acc2.Name : "",
                    l.Debit, l.Credit, l.Description))
                .ToList();

            return new JournalEntryDto(
                e.Id, e.EntryNumber, e.EntryDate, e.Description, e.ReferenceType, e.ReferenceId, e.Status,
                e.CreatedBy, e.CreatedBy.HasValue ? creatorNames.GetValueOrDefault(e.CreatedBy.Value) : null,
                entryLines.Sum(l => l.Debit), entryLines.Sum(l => l.Credit), entryLines,
                e.IsReversed, e.ReversalOfEntryId, e.CreatedAt);
        }).ToList();
    }
}

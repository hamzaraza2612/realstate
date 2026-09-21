using Microsoft.EntityFrameworkCore;
using Npgsql;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Construction.Expenses;
using RealEstateErp.Application.Finance;
using RealEstateErp.Domain.Construction;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Construction;

public class ExpenseService : IExpenseService
{
    private const decimal Tolerance = 0.01m;

    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;
    private readonly IConstructionFinancePostingService _financePosting;

    public ExpenseService(AppDbContext db, ITenantContext tenantContext, IAuditLogger auditLogger, IConstructionFinancePostingService financePosting)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
        _financePosting = financePosting;
    }

    public async Task<PagedResult<ExpenseDto>> ListAsync(PagedRequest request, ExpenseFilter filter, CancellationToken ct = default)
    {
        var query = _db.Expenses.AsQueryable();
        if (filter.ProjectId.HasValue) query = query.Where(e => e.ProjectId == filter.ProjectId);
        if (filter.WorkPackageId.HasValue) query = query.Where(e => e.WorkPackageId == filter.WorkPackageId);
        if (filter.Status.HasValue) query = query.Where(e => e.Status == filter.Status);
        if (filter.Category.HasValue) query = query.Where(e => e.Category == filter.Category);

        var total = await query.CountAsync(ct);
        var expenses = await query.OrderByDescending(e => e.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<ExpenseDto>(await ToDtosAsync(expenses, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<ExpenseDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var expense = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id, ct);
        if (expense is null) return Result.Failure<ExpenseDto>("Expense not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { expense }, ct))[0]);
    }

    public async Task<Result<ExpenseDto>> CreateAsync(CreateExpenseRequest request, CancellationToken ct = default)
    {
        var projectExists = await _db.Projects.AnyAsync(p => p.Id == request.ProjectId, ct);
        if (!projectExists) return Result.Failure<ExpenseDto>("Project not found.", "not_found");

        var expense = new Expense
        {
            ProjectId = request.ProjectId,
            WorkPackageId = request.WorkPackageId,
            Category = request.Category,
            Amount = request.Amount,
            ExpenseDate = request.ExpenseDate,
            VendorId = request.VendorId,
            ReferenceNumber = request.ReferenceNumber,
            Notes = request.Notes,
            Status = ExpenseStatus.Pending
        };
        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Construction", "Expense", expense.Id.ToString(), after: new { expense.ProjectId, expense.Amount }, ct: ct);
        return Result.Success((await ToDtosAsync(new[] { expense }, ct))[0]);
    }

    public async Task<Result<ExpenseDto>> ApproveAsync(Guid id, CancellationToken ct = default)
    {
        var expense = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id, ct);
        if (expense is null) return Result.Failure<ExpenseDto>("Expense not found.", "not_found");
        if (expense.Status != ExpenseStatus.Pending) return Result.Failure<ExpenseDto>("Only pending expenses can be approved.", "invalid_state");

        await using var transaction = await _db.Database.BeginTransactionAsync(ct);

        var postingResult = await _financePosting.PostExpenseApprovalAsync(expense.Id, expense.Amount, expense.ExpenseDate, expense.ReferenceNumber, ct);
        if (!postingResult.Succeeded)
        {
            await transaction.RollbackAsync(ct);
            return Result.Failure<ExpenseDto>(postingResult.Error!, postingResult.ErrorCode!);
        }

        expense.Status = ExpenseStatus.Approved;
        expense.JournalEntryId = postingResult.Value;
        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        await _auditLogger.LogAsync("Approve", "Construction", "Expense", expense.Id.ToString(), after: new { expense.JournalEntryId }, ct: ct);
        return Result.Success((await ToDtosAsync(new[] { expense }, ct))[0]);
    }

    public async Task<Result<ExpenseDto>> RejectAsync(Guid id, CancellationToken ct = default)
    {
        var expense = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id, ct);
        if (expense is null) return Result.Failure<ExpenseDto>("Expense not found.", "not_found");
        if (expense.Status != ExpenseStatus.Pending) return Result.Failure<ExpenseDto>("Only pending expenses can be rejected.", "invalid_state");

        expense.Status = ExpenseStatus.Rejected;
        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("Reject", "Construction", "Expense", expense.Id.ToString(), ct: ct);
        return Result.Success((await ToDtosAsync(new[] { expense }, ct))[0]);
    }

    public async Task<Result<IReadOnlyList<ExpensePaymentDto>>> ListPaymentsAsync(Guid expenseId, CancellationToken ct = default)
    {
        var expenseExists = await _db.Expenses.AnyAsync(e => e.Id == expenseId, ct);
        if (!expenseExists) return Result.Failure<IReadOnlyList<ExpensePaymentDto>>("Expense not found.", "not_found");

        var payments = await _db.ExpensePayments.Where(p => p.ExpenseId == expenseId).OrderByDescending(p => p.CreatedAt).ToListAsync(ct);
        return Result.Success<IReadOnlyList<ExpensePaymentDto>>(await ToPaymentDtosAsync(payments, ct));
    }

    public async Task<Result<ExpensePaymentDto>> PayAsync(Guid expenseId, PayExpenseRequest request, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            var existing = await _db.ExpensePayments.FirstOrDefaultAsync(
                p => p.ExpenseId == expenseId && p.IdempotencyKey == request.IdempotencyKey, ct);
            if (existing is not null) return Result.Success((await ToPaymentDtosAsync(new[] { existing }, ct))[0]);
        }

        var expense = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == expenseId, ct);
        if (expense is null) return Result.Failure<ExpensePaymentDto>("Expense not found.", "not_found");
        if (expense.Status != ExpenseStatus.Approved)
            return Result.Failure<ExpensePaymentDto>("Only approved expenses can be paid.", "expense_not_approved");

        var outstanding = expense.Amount - expense.PaidAmount;
        if (request.Amount > outstanding + Tolerance)
        {
            return Result.Failure<ExpensePaymentDto>(
                $"Payment of {request.Amount:0.00} exceeds the outstanding payable of {outstanding:0.00} for this expense.", "overpayment_not_allowed");
        }

        for (var attempt = 0; attempt < 5; attempt++)
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);

            var sequence = await _db.ExpensePayments.CountAsync(ct) + 1 + attempt;
            var payment = new ExpensePayment
            {
                ReceiptNumber = $"EXP-PMT-{sequence:D6}",
                ExpenseId = expenseId,
                Amount = request.Amount,
                PaymentDate = request.PaymentDate,
                ReferenceNumber = request.ReferenceNumber,
                Notes = request.Notes,
                RecordedByUserId = _tenantContext.UserId ?? Guid.Empty,
                IdempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey
            };
            _db.ExpensePayments.Add(payment);

            expense.PaidAmount += request.Amount;

            var postingResult = await _financePosting.PostExpensePaymentAsync(
                payment.Id, payment.Amount, payment.PaymentDate, payment.ReferenceNumber, ct);
            if (!postingResult.Succeeded)
            {
                await transaction.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
                return Result.Failure<ExpensePaymentDto>(postingResult.Error!, postingResult.ErrorCode!);
            }

            payment.JournalEntryId = postingResult.Value;

            try
            {
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                await _auditLogger.LogAsync("Pay", "Construction", "Expense", expense.Id.ToString(),
                    after: new { payment.ReceiptNumber, payment.Amount, expense.PaidAmount }, ct: ct);

                return Result.Success((await ToPaymentDtosAsync(new[] { payment }, ct))[0]);
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
            {
                await transaction.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
                expense = await _db.Expenses.FirstAsync(e => e.Id == expenseId, ct);
            }
        }

        return Result.Failure<ExpensePaymentDto>("Could not generate a unique receipt number, please retry.", "conflict");
    }

    private async Task<List<ExpensePaymentDto>> ToPaymentDtosAsync(IReadOnlyCollection<ExpensePayment> payments, CancellationToken ct)
    {
        var userIds = payments.Select(p => p.RecordedByUserId).Distinct().ToList();
        var userNames = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        return payments.Select(p => new ExpensePaymentDto(
            p.Id, p.ReceiptNumber, p.ExpenseId, p.Amount, p.PaymentDate, p.ReferenceNumber, p.Notes,
            p.RecordedByUserId, userNames.GetValueOrDefault(p.RecordedByUserId), p.JournalEntryId, p.CreatedAt)).ToList();
    }

    private async Task<List<ExpenseDto>> ToDtosAsync(IReadOnlyCollection<Expense> expenses, CancellationToken ct)
    {
        var projectIds = expenses.Select(e => e.ProjectId).Distinct().ToList();
        var projectNames = await _db.Projects.Where(p => projectIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var wpIds = expenses.Where(e => e.WorkPackageId.HasValue).Select(e => e.WorkPackageId!.Value).Distinct().ToList();
        var wpNames = await _db.WorkPackages.Where(w => wpIds.Contains(w.Id)).ToDictionaryAsync(w => w.Id, w => w.Name, ct);
        var vendorIds = expenses.Where(e => e.VendorId.HasValue).Select(e => e.VendorId!.Value).Distinct().ToList();
        var vendorNames = await _db.Vendors.Where(v => vendorIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id, v => v.Name, ct);

        return expenses.Select(e => new ExpenseDto(
            e.Id, e.ProjectId, projectNames.GetValueOrDefault(e.ProjectId, ""),
            e.WorkPackageId, e.WorkPackageId.HasValue ? wpNames.GetValueOrDefault(e.WorkPackageId.Value) : null,
            e.Category, e.Amount, e.ExpenseDate, e.VendorId, e.VendorId.HasValue ? vendorNames.GetValueOrDefault(e.VendorId.Value) : null,
            e.ReferenceNumber, e.Notes, e.Status, e.JournalEntryId, e.PaidAmount, e.CreatedAt)).ToList();
    }
}

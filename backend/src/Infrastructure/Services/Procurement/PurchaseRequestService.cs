using Microsoft.EntityFrameworkCore;
using Npgsql;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Procurement.PurchaseRequests;
using RealEstateErp.Domain.Procurement;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Procurement;

public class PurchaseRequestService : IPurchaseRequestService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;

    public PurchaseRequestService(AppDbContext db, ITenantContext tenantContext, IAuditLogger auditLogger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<PurchaseRequestDto>> ListAsync(PagedRequest request, PurchaseRequestFilter filter, CancellationToken ct = default)
    {
        var query = _db.PurchaseRequests.AsQueryable();
        if (filter.ProjectId.HasValue) query = query.Where(r => r.ProjectId == filter.ProjectId);
        if (filter.Status.HasValue) query = query.Where(r => r.Status == filter.Status);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            query = query.Where(r => r.RequestNumber.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var requests = await query.OrderByDescending(r => r.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<PurchaseRequestDto>(await ToDtosAsync(requests, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<PurchaseRequestDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var pr = await _db.PurchaseRequests.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (pr is null) return Result.Failure<PurchaseRequestDto>("Purchase request not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { pr }, ct))[0]);
    }

    public async Task<Result<PurchaseRequestDto>> CreateAsync(CreatePurchaseRequestRequest request, CancellationToken ct = default)
    {
        var projectExists = await _db.Projects.AnyAsync(p => p.Id == request.ProjectId, ct);
        if (!projectExists) return Result.Failure<PurchaseRequestDto>("Project not found.", "not_found");

        for (var attempt = 0; attempt < 5; attempt++)
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);

            var sequence = await _db.PurchaseRequests.CountAsync(ct) + 1 + attempt;
            var pr = new PurchaseRequest
            {
                RequestNumber = $"PR-{sequence:D6}",
                ProjectId = request.ProjectId,
                WorkPackageId = request.WorkPackageId,
                RequestedByUserId = _tenantContext.UserId ?? Guid.Empty,
                RequiredDate = request.RequiredDate,
                Priority = request.Priority,
                Notes = request.Notes,
                Status = PurchaseRequestStatus.Draft
            };
            _db.PurchaseRequests.Add(pr);
            _db.PurchaseRequestLines.AddRange(BuildLines(pr.Id, request.Lines));

            try
            {
                await _db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
                await _auditLogger.LogAsync("Create", "Procurement", "PurchaseRequest", pr.Id.ToString(), after: new { pr.RequestNumber, pr.ProjectId }, ct: ct);
                return Result.Success((await ToDtosAsync(new[] { pr }, ct))[0]);
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
            {
                await transaction.RollbackAsync(ct);
                _db.ChangeTracker.Clear();
            }
        }

        return Result.Failure<PurchaseRequestDto>("Could not generate a unique request number, please retry.", "conflict");
    }

    public async Task<Result<PurchaseRequestDto>> UpdateAsync(Guid id, UpdatePurchaseRequestRequest request, CancellationToken ct = default)
    {
        var pr = await _db.PurchaseRequests.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (pr is null) return Result.Failure<PurchaseRequestDto>("Purchase request not found.", "not_found");
        if (pr.Status != PurchaseRequestStatus.Draft) return Result.Failure<PurchaseRequestDto>("Only draft requests can be edited.", "invalid_state");

        pr.RequiredDate = request.RequiredDate;
        pr.Priority = request.Priority;
        pr.Notes = request.Notes;

        var existingLines = await _db.PurchaseRequestLines.Where(l => l.PurchaseRequestId == id).ToListAsync(ct);
        _db.PurchaseRequestLines.RemoveRange(existingLines);
        _db.PurchaseRequestLines.AddRange(BuildLines(id, request.Lines));

        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("Update", "Procurement", "PurchaseRequest", pr.Id.ToString(), after: new { LineCount = request.Lines.Count }, ct: ct);
        return Result.Success((await ToDtosAsync(new[] { pr }, ct))[0]);
    }

    public Task<Result<PurchaseRequestDto>> SubmitAsync(Guid id, CancellationToken ct = default) => TransitionAsync(id, PurchaseRequestStatus.Submitted, ct);
    public Task<Result<PurchaseRequestDto>> ApproveAsync(Guid id, CancellationToken ct = default) => TransitionAsync(id, PurchaseRequestStatus.Approved, ct);
    public Task<Result<PurchaseRequestDto>> RejectAsync(Guid id, CancellationToken ct = default) => TransitionAsync(id, PurchaseRequestStatus.Rejected, ct);
    public Task<Result<PurchaseRequestDto>> CancelAsync(Guid id, CancellationToken ct = default) => TransitionAsync(id, PurchaseRequestStatus.Cancelled, ct);

    private async Task<Result<PurchaseRequestDto>> TransitionAsync(Guid id, PurchaseRequestStatus target, CancellationToken ct)
    {
        var pr = await _db.PurchaseRequests.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (pr is null) return Result.Failure<PurchaseRequestDto>("Purchase request not found.", "not_found");
        if (!PurchaseRequestStatusRules.CanTransition(pr.Status, target))
            return Result.Failure<PurchaseRequestDto>($"Cannot transition purchase request from {pr.Status} to {target}.", "invalid_transition");

        var before = pr.Status;
        pr.Status = target;
        await _db.SaveChangesAsync(ct);
        await _auditLogger.LogAsync("Transition", "Procurement", "PurchaseRequest", pr.Id.ToString(), new { Status = before }, new { pr.Status }, ct: ct);
        return Result.Success((await ToDtosAsync(new[] { pr }, ct))[0]);
    }

    private static List<PurchaseRequestLine> BuildLines(Guid purchaseRequestId, IReadOnlyList<CreatePurchaseRequestLineRequest> lines) =>
        lines.Select(l => new PurchaseRequestLine
        {
            PurchaseRequestId = purchaseRequestId,
            MaterialId = l.MaterialId,
            ItemDescription = l.ItemDescription,
            UnitOfMeasure = l.UnitOfMeasure,
            Quantity = l.Quantity,
            EstimatedUnitPrice = l.EstimatedUnitPrice,
            EstimatedTotal = Math.Round(l.Quantity * l.EstimatedUnitPrice, 2)
        }).ToList();

    private async Task<List<PurchaseRequestDto>> ToDtosAsync(IReadOnlyCollection<PurchaseRequest> requests, CancellationToken ct)
    {
        var ids = requests.Select(r => r.Id).ToList();
        var lines = await _db.PurchaseRequestLines.Where(l => ids.Contains(l.PurchaseRequestId)).ToListAsync(ct);
        var projectIds = requests.Select(r => r.ProjectId).Distinct().ToList();
        var projectNames = await _db.Projects.Where(p => projectIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var wpIds = requests.Where(r => r.WorkPackageId.HasValue).Select(r => r.WorkPackageId!.Value).Distinct().ToList();
        var wpNames = await _db.WorkPackages.Where(w => wpIds.Contains(w.Id)).ToDictionaryAsync(w => w.Id, w => w.Name, ct);
        var userIds = requests.Select(r => r.RequestedByUserId).Distinct().ToList();
        var userNames = await _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        return requests.Select(r =>
        {
            var reqLines = lines.Where(l => l.PurchaseRequestId == r.Id)
                .Select(l => new PurchaseRequestLineDto(l.Id, l.MaterialId, l.ItemDescription, l.UnitOfMeasure, l.Quantity, l.EstimatedUnitPrice, l.EstimatedTotal))
                .ToList();
            return new PurchaseRequestDto(
                r.Id, r.RequestNumber, r.ProjectId, projectNames.GetValueOrDefault(r.ProjectId, ""),
                r.WorkPackageId, r.WorkPackageId.HasValue ? wpNames.GetValueOrDefault(r.WorkPackageId.Value) : null,
                r.RequestedByUserId, userNames.GetValueOrDefault(r.RequestedByUserId), r.RequiredDate, r.Priority, r.Status, r.Notes,
                reqLines.Sum(l => l.EstimatedTotal), reqLines, r.CreatedAt, r.UpdatedAt);
        }).ToList();
    }
}

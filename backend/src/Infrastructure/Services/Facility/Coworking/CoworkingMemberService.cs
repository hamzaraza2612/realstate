using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Coworking;
using RealEstateErp.Domain.Crm;
using RealEstateErp.Domain.Facility.Coworking;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Facility.Coworking;

public class CoworkingMemberService : ICoworkingMemberService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public CoworkingMemberService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<CoworkingMemberDto>> ListAsync(PagedRequest request, CoworkingMemberFilter filter, CancellationToken ct = default)
    {
        var query = _db.CoworkingMembers.AsQueryable();
        if (filter.IsActive.HasValue) query = query.Where(m => m.IsActive == filter.IsActive);

        var all = await query.OrderByDescending(m => m.CreatedAt).ToListAsync(ct);
        var dtos = await ToDtosAsync(all, ct);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.ToLowerInvariant();
            dtos = dtos.Where(d => d.CustomerName.ToLowerInvariant().Contains(s)).ToList();
        }

        var total = dtos.Count;
        var page = dtos.Skip(request.Skip).Take(request.PageSize).ToList();
        return new PagedResult<CoworkingMemberDto>(page, request.Page, request.PageSize, total);
    }

    public async Task<Result<CoworkingMemberDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var member = await _db.CoworkingMembers.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (member is null) return Result.Failure<CoworkingMemberDto>("Member not found.", "not_found");
        return Result.Success((await ToDtosAsync(new[] { member }, ct))[0]);
    }

    public async Task<Result<CoworkingMemberDto>> CreateAsync(CreateCoworkingMemberRequest request, CancellationToken ct = default)
    {
        Guid customerId;
        if (request.CustomerId.HasValue)
        {
            var customerExists = await _db.Customers.AnyAsync(c => c.Id == request.CustomerId, ct);
            if (!customerExists) return Result.Failure<CoworkingMemberDto>("Customer not found.", "not_found");

            var alreadyLinked = await _db.CoworkingMembers.AnyAsync(m => m.CustomerId == request.CustomerId, ct);
            if (alreadyLinked) return Result.Failure<CoworkingMemberDto>("This customer is already registered as a coworking member.", "duplicate_member");

            customerId = request.CustomerId.Value;
        }
        else
        {
            var customer = new Customer { FullName = request.FullName!, Email = request.Email, Phone = request.Phone };
            _db.Customers.Add(customer);
            await _db.SaveChangesAsync(ct);
            customerId = customer.Id;
        }

        var member = new CoworkingMember { CustomerId = customerId, Notes = request.Notes };
        _db.CoworkingMembers.Add(member);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Facility", "CoworkingMember", member.Id.ToString(), after: new { member.CustomerId }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { member }, ct))[0]);
    }

    public async Task<Result<CoworkingMemberDto>> UpdateAsync(Guid id, UpdateCoworkingMemberRequest request, CancellationToken ct = default)
    {
        var member = await _db.CoworkingMembers.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (member is null) return Result.Failure<CoworkingMemberDto>("Member not found.", "not_found");

        member.IsActive = request.IsActive;
        member.Notes = request.Notes;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Facility", "CoworkingMember", member.Id.ToString(), after: new { member.IsActive }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { member }, ct))[0]);
    }

    private async Task<List<CoworkingMemberDto>> ToDtosAsync(IReadOnlyCollection<CoworkingMember> members, CancellationToken ct)
    {
        var customerIds = members.Select(m => m.CustomerId).Distinct().ToList();
        var customers = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c, ct);
        var memberIds = members.Select(m => m.Id).ToList();
        var activeMembershipCounts = await _db.Memberships
            .Where(m => memberIds.Contains(m.MemberId) && m.Status == MembershipStatus.Active)
            .GroupBy(m => m.MemberId).Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(g => g.Key, g => g.Count, ct);

        return members.Select(m =>
        {
            customers.TryGetValue(m.CustomerId, out var customer);
            return new CoworkingMemberDto(
                m.Id, m.CustomerId, customer?.FullName ?? "", customer?.Email, customer?.Phone, m.IsActive, m.Notes,
                activeMembershipCounts.GetValueOrDefault(m.Id, 0), m.CreatedAt);
        }).ToList();
    }
}

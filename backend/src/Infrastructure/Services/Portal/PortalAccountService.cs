using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Portal;
using RealEstateErp.Domain.Portal;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Portal;

public class PortalAccountService : IPortalAccountService
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<PortalUser> _passwordHasher;
    private readonly IAuditLogger _auditLogger;
    private readonly ITenantContext _tenantContext;
    private readonly PortalActorResolver _actorResolver;
    private readonly PortalPasswordResetIssuer _resetIssuer;

    public PortalAccountService(
        AppDbContext db, IPasswordHasher<PortalUser> passwordHasher, IAuditLogger auditLogger,
        ITenantContext tenantContext, PortalActorResolver actorResolver, PortalPasswordResetIssuer resetIssuer)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _auditLogger = auditLogger;
        _tenantContext = tenantContext;
        _actorResolver = actorResolver;
        _resetIssuer = resetIssuer;
    }

    public async Task<PagedResult<PortalAccountDto>> ListAsync(PagedRequest request, PortalAccountFilter filter, CancellationToken ct = default)
    {
        var query = _db.PortalUsers.AsQueryable();
        if (!string.IsNullOrWhiteSpace(filter.ActorType)) query = query.Where(u => u.ActorType == filter.ActorType);
        if (filter.ActorId.HasValue) query = query.Where(u => u.ActorId == filter.ActorId);

        var users = await query.OrderByDescending(u => u.CreatedAt).ToListAsync(ct);
        var total = users.Count;
        var page = users.Skip(request.Skip).Take(request.PageSize).ToList();

        var dtos = new List<PortalAccountDto>();
        foreach (var user in page)
        {
            var actor = await _actorResolver.ResolveAsync(user.TenantId, user.ActorType, user.ActorId, ct);
            dtos.Add(new PortalAccountDto(user.Id, user.Email, user.ActorType, user.ActorId, actor.DisplayName, user.IsActive, user.LastLoginAt, user.CreatedAt));
        }

        return new PagedResult<PortalAccountDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<Result<PortalAccountDto>> InviteAsync(InvitePortalAccountRequest request, CancellationToken ct = default)
    {
        if (_tenantContext.TenantId is not { } tenantId)
        {
            return Result.Failure<PortalAccountDto>("No tenant context.", "no_tenant");
        }

        var actor = await _actorResolver.ResolveAsync(tenantId, request.ActorType, request.ActorId, ct);
        if (!actor.Exists)
        {
            return Result.Failure<PortalAccountDto>("The selected record was not found.", "actor_not_found");
        }

        var email = string.IsNullOrWhiteSpace(request.Email) ? actor.Email : request.Email;
        if (string.IsNullOrWhiteSpace(email))
        {
            return Result.Failure<PortalAccountDto>("This record has no email on file — provide one explicitly.", "email_required");
        }

        var alreadyLinked = await _db.PortalUsers.AnyAsync(u => u.ActorType == request.ActorType && u.ActorId == request.ActorId, ct);
        if (alreadyLinked)
        {
            return Result.Failure<PortalAccountDto>("This record already has a portal account.", "already_invited");
        }

        var normalizedEmail = email.Trim().ToUpperInvariant();
        var emailTaken = await _db.PortalUsers.AnyAsync(u => u.NormalizedEmail == normalizedEmail, ct);
        if (emailTaken)
        {
            return Result.Failure<PortalAccountDto>("A portal account with this email already exists for this organization.", "email_taken");
        }

        var user = new PortalUser
        {
            Email = email,
            NormalizedEmail = normalizedEmail,
            ActorType = request.ActorType,
            ActorId = request.ActorId,
            IsActive = true
        };
        // No usable password yet — a random value that IssueResetTokenAndEmailAsync's activation link
        // is the only way to replace. VerifyHashedPassword can never match a value nobody has.
        user.PasswordHash = _passwordHasher.HashPassword(user, Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N"));

        _db.PortalUsers.Add(user);
        await _db.SaveChangesAsync(ct);

        await _resetIssuer.IssueAndEmailAsync(user, isInitialActivation: true, ct);

        await _auditLogger.LogAsync("Invite", "Portal", "PortalUser", user.Id.ToString(),
            after: new { user.Email, user.ActorType, user.ActorId }, ct: ct);

        return Result.Success(new PortalAccountDto(user.Id, user.Email, user.ActorType, user.ActorId, actor.DisplayName, user.IsActive, null, user.CreatedAt));
    }

    public async Task<Result<PortalAccountDto>> DeactivateAsync(Guid id, CancellationToken ct = default) => await SetActiveAsync(id, false, ct);
    public async Task<Result<PortalAccountDto>> ReactivateAsync(Guid id, CancellationToken ct = default) => await SetActiveAsync(id, true, ct);

    private async Task<Result<PortalAccountDto>> SetActiveAsync(Guid id, bool active, CancellationToken ct)
    {
        var user = await _db.PortalUsers.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null)
        {
            return Result.Failure<PortalAccountDto>("Not found.", "not_found");
        }

        user.IsActive = active;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync(active ? "Reactivate" : "Deactivate", "Portal", "PortalUser", user.Id.ToString(), ct: ct);

        var actor = await _actorResolver.ResolveAsync(user.TenantId, user.ActorType, user.ActorId, ct);
        return Result.Success(new PortalAccountDto(user.Id, user.Email, user.ActorType, user.ActorId, actor.DisplayName, user.IsActive, user.LastLoginAt, user.CreatedAt));
    }
}

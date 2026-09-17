using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Organizations;
using RealEstateErp.Domain.Tenancy;
using RealEstateErp.Infrastructure.Identity;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services;

public class OrganizationService : IOrganizationService
{
    private readonly AppDbContext _db;
    private readonly UserManager<AppUser> _userManager;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;

    public OrganizationService(AppDbContext db, UserManager<AppUser> userManager, ITenantContext tenantContext, IAuditLogger auditLogger)
    {
        _db = db;
        _userManager = userManager;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<OrganizationDto>> ListAsync(PagedRequest request, string? search, CancellationToken ct = default)
    {
        var query = _db.Tenants.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLowerInvariant();
            query = query.Where(t => t.Name.ToLower().Contains(s) || t.Slug.Contains(s));
        }

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(t => t.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);

        return new PagedResult<OrganizationDto>(items.Select(ToDto).ToList(), request.Page, request.PageSize, total);
    }

    public async Task<Result<OrganizationDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == id, ct);
        return tenant is null
            ? Result.Failure<OrganizationDto>("Organization not found.", "not_found")
            : Result.Success(ToDto(tenant));
    }

    public async Task<Result<OrganizationDto>> GetCurrentAsync(CancellationToken ct = default)
    {
        if (_tenantContext.TenantId is null)
        {
            return Result.Failure<OrganizationDto>("No organization context.", "no_tenant");
        }

        var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == _tenantContext.TenantId, ct);
        return tenant is null
            ? Result.Failure<OrganizationDto>("Organization not found.", "not_found")
            : Result.Success(ToDto(tenant));
    }

    public async Task<Result<OrganizationDto>> CreateAsync(CreateOrganizationRequest request, CancellationToken ct = default)
    {
        var slugTaken = await _db.Tenants.AnyAsync(t => t.Slug == request.Slug, ct);
        if (slugTaken)
        {
            return Result.Failure<OrganizationDto>("An organization with this slug already exists.", "slug_taken");
        }

        var ownerEmailTaken = await _userManager.FindByEmailAsync(request.OwnerEmail);
        if (ownerEmailTaken is not null)
        {
            return Result.Failure<OrganizationDto>("A user with the owner email already exists.", "email_taken");
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(ct);

        var tenant = new Tenant
        {
            Name = request.Name,
            Slug = request.Slug,
            ContactEmail = request.ContactEmail,
            ContactPhone = request.ContactPhone,
            Timezone = request.Timezone,
            SubscriptionPlanId = request.SubscriptionPlanId,
            Status = TenantStatus.Trial,
            TrialEndsAt = DateTimeOffset.UtcNow.AddDays(14)
        };
        _db.Tenants.Add(tenant);
        await _db.SaveChangesAsync(ct);

        var owner = new AppUser
        {
            Email = request.OwnerEmail,
            UserName = request.OwnerEmail,
            FullName = request.OwnerFullName,
            TenantId = tenant.Id,
            EmailConfirmed = true,
            IsActive = true
        };
        var createResult = await _userManager.CreateAsync(owner, request.OwnerPassword);
        if (!createResult.Succeeded)
        {
            await transaction.RollbackAsync(ct);
            return Result.Failure<OrganizationDto>(string.Join(" ", createResult.Errors.Select(e => e.Description)), "identity_error");
        }

        await _userManager.AddToRoleAsync(owner, "Organization Owner");

        await transaction.CommitAsync(ct);

        await _auditLogger.LogAsync("Create", "Organizations", "Tenant", tenant.Id.ToString(),
            after: new { tenant.Name, tenant.Slug, request.OwnerEmail }, ct: ct);

        return Result.Success(ToDto(tenant));
    }

    public async Task<Result<OrganizationDto>> UpdateAsync(Guid id, UpdateOrganizationRequest request, CancellationToken ct = default)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (tenant is null) return Result.Failure<OrganizationDto>("Organization not found.", "not_found");

        var before = new { tenant.Name, tenant.ContactEmail, tenant.ContactPhone, tenant.Timezone };
        tenant.Name = request.Name;
        tenant.ContactEmail = request.ContactEmail;
        tenant.ContactPhone = request.ContactPhone;
        tenant.Timezone = request.Timezone;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Organizations", "Tenant", tenant.Id.ToString(), before,
            new { tenant.Name, tenant.ContactEmail, tenant.ContactPhone, tenant.Timezone }, ct: ct);

        return Result.Success(ToDto(tenant));
    }

    public async Task<Result<OrganizationDto>> UpdateStatusAsync(Guid id, UpdateOrganizationStatusRequest request, CancellationToken ct = default)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (tenant is null) return Result.Failure<OrganizationDto>("Organization not found.", "not_found");

        var before = tenant.Status;
        tenant.Status = request.Status;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("UpdateStatus", "Organizations", "Tenant", tenant.Id.ToString(),
            new { Status = before }, new { tenant.Status }, ct: ct);

        return Result.Success(ToDto(tenant));
    }

    private static OrganizationDto ToDto(Tenant t) => new(
        t.Id, t.Name, t.Slug, t.Status, t.Timezone, t.ContactEmail, t.ContactPhone,
        t.SubscriptionPlanId, t.TrialEndsAt, t.CreatedAt);
}

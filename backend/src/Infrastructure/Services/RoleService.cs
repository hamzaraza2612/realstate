using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Roles;
using RealEstateErp.Infrastructure.Identity;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services;

public class RoleService : IRoleService
{
    private readonly AppDbContext _db;
    private readonly RoleManager<AppRole> _roleManager;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;

    public RoleService(AppDbContext db, RoleManager<AppRole> roleManager, ITenantContext tenantContext, IAuditLogger auditLogger)
    {
        _db = db;
        _roleManager = roleManager;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
    }

    public async Task<IReadOnlyList<RoleDto>> ListAsync(CancellationToken ct = default)
    {
        var roles = await _db.Roles.Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .OrderBy(r => r.Name)
            .ToListAsync(ct);

        return roles.Select(ToDto).ToList();
    }

    public async Task<IReadOnlyList<PermissionDto>> ListPermissionsAsync(CancellationToken ct = default)
    {
        var permissions = await _db.Permissions.OrderBy(p => p.Module).ThenBy(p => p.Code).ToListAsync(ct);
        return permissions.Select(p => new PermissionDto(p.Id, p.Code, p.Module, p.Description)).ToList();
    }

    public async Task<Result<RoleDto>> CreateAsync(CreateRoleRequest request, CancellationToken ct = default)
    {
        if (_tenantContext.TenantId is null)
        {
            return Result.Failure<RoleDto>("Custom roles can only be created within an organization.", "no_tenant");
        }

        var exists = await _roleManager.Roles.AnyAsync(r => r.NormalizedName == request.Name.ToUpperInvariant(), ct);
        if (exists)
        {
            return Result.Failure<RoleDto>("A role with this name already exists.", "name_taken");
        }

        var role = new AppRole
        {
            Name = request.Name,
            TenantId = _tenantContext.TenantId,
            Description = request.Description,
            IsSystem = false
        };

        var createResult = await _roleManager.CreateAsync(role);
        if (!createResult.Succeeded)
        {
            return Result.Failure<RoleDto>(string.Join(" ", createResult.Errors.Select(e => e.Description)), "identity_error");
        }

        await SetPermissionsAsync(role.Id, request.PermissionCodes, ct);
        await _auditLogger.LogAsync("Create", "Roles", "Role", role.Id.ToString(), after: new { role.Name, request.PermissionCodes }, ct: ct);

        return Result.Success(await GetDtoAsync(role.Id, ct));
    }

    public async Task<Result<RoleDto>> UpdateAsync(Guid id, UpdateRoleRequest request, CancellationToken ct = default)
    {
        var role = await _roleManager.FindByIdAsync(id.ToString());
        if (role is null) return Result.Failure<RoleDto>("Role not found.", "not_found");
        if (role.IsSystem) return Result.Failure<RoleDto>("System roles cannot be modified.", "system_role");

        role.Description = request.Description;
        await _roleManager.UpdateAsync(role);
        await SetPermissionsAsync(role.Id, request.PermissionCodes, ct);

        await _auditLogger.LogAsync("Update", "Roles", "Role", role.Id.ToString(), after: new { role.Description, request.PermissionCodes }, ct: ct);

        return Result.Success(await GetDtoAsync(role.Id, ct));
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var role = await _roleManager.FindByIdAsync(id.ToString());
        if (role is null) return Result.Failure("Role not found.", "not_found");
        if (role.IsSystem) return Result.Failure("System roles cannot be deleted.", "system_role");

        await _roleManager.DeleteAsync(role);
        await _auditLogger.LogAsync("Delete", "Roles", "Role", id.ToString(), ct: ct);

        return Result.Success();
    }

    private async Task SetPermissionsAsync(Guid roleId, IReadOnlyList<string> permissionCodes, CancellationToken ct)
    {
        var existing = _db.RolePermissions.Where(rp => rp.RoleId == roleId);
        _db.RolePermissions.RemoveRange(existing);

        var permissionIds = await _db.Permissions.Where(p => permissionCodes.Contains(p.Code)).Select(p => p.Id).ToListAsync(ct);
        foreach (var permissionId in permissionIds)
        {
            _db.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = permissionId });
        }

        await _db.SaveChangesAsync(ct);
    }

    private async Task<RoleDto> GetDtoAsync(Guid id, CancellationToken ct)
    {
        var role = await _db.Roles.Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .FirstAsync(r => r.Id == id, ct);
        return ToDto(role);
    }

    private static RoleDto ToDto(AppRole role) => new(
        role.Id, role.Name!, role.Description, role.IsSystem, role.TenantId != null,
        role.RolePermissions.Select(rp => rp.Permission!.Code).ToList());
}

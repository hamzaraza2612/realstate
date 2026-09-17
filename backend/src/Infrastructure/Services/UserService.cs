using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Users;
using RealEstateErp.Infrastructure.Identity;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Exceptions;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;
    private readonly UserManager<AppUser> _userManager;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;

    public UserService(AppDbContext db, UserManager<AppUser> userManager, ITenantContext tenantContext, IAuditLogger auditLogger)
    {
        _db = db;
        _userManager = userManager;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<UserDto>> ListAsync(PagedRequest request, string? search, CancellationToken ct = default)
    {
        var query = _userManager.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLowerInvariant();
            query = query.Where(u => u.Email!.ToLower().Contains(s) || u.FullName.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var users = await query.OrderByDescending(u => u.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);

        var dtos = new List<UserDto>();
        foreach (var user in users)
        {
            dtos.Add(await ToDtoAsync(user));
        }

        return new PagedResult<UserDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<Result<UserDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return Result.Failure<UserDto>("User not found.", "not_found");
        return Result.Success(await ToDtoAsync(user));
    }

    public async Task<Result<UserDto>> CreateAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            return Result.Failure<UserDto>("A user with this email already exists.", "email_taken");
        }

        var user = new AppUser
        {
            Email = request.Email,
            UserName = request.Email,
            FullName = request.FullName,
            PhoneNumber = request.PhoneNumber,
            TenantId = _tenantContext.TenantId,
            EmailConfirmed = true,
            IsActive = true
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return Result.Failure<UserDto>(string.Join(" ", createResult.Errors.Select(e => e.Description)), "identity_error");
        }

        if (request.RoleNames.Count > 0)
        {
            var addRolesResult = await _userManager.AddToRolesAsync(user, request.RoleNames);
            if (!addRolesResult.Succeeded)
            {
                return Result.Failure<UserDto>(string.Join(" ", addRolesResult.Errors.Select(e => e.Description)), "identity_error");
            }
        }

        await _auditLogger.LogAsync("Create", "Users", "User", user.Id.ToString(), after: new { user.Email, user.FullName, request.RoleNames }, ct: ct);

        return Result.Success(await ToDtoAsync(user));
    }

    public async Task<Result<UserDto>> UpdateAsync(Guid id, UpdateUserRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return Result.Failure<UserDto>("User not found.", "not_found");

        var before = new { user.FullName, user.PhoneNumber, user.IsActive };
        user.FullName = request.FullName;
        user.PhoneNumber = request.PhoneNumber;
        user.IsActive = request.IsActive;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return Result.Failure<UserDto>(string.Join(" ", updateResult.Errors.Select(e => e.Description)), "identity_error");
        }

        await _auditLogger.LogAsync("Update", "Users", "User", user.Id.ToString(), before, new { user.FullName, user.PhoneNumber, user.IsActive }, ct: ct);

        return Result.Success(await ToDtoAsync(user));
    }

    public async Task<Result> DeactivateAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return Result.Failure("User not found.", "not_found");

        user.IsActive = false;
        await _userManager.UpdateAsync(user);
        await _auditLogger.LogAsync("Deactivate", "Users", "User", user.Id.ToString(), ct: ct);

        return Result.Success();
    }

    public async Task<Result<UserDto>> AssignRolesAsync(Guid id, AssignRolesRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return Result.Failure<UserDto>("User not found.", "not_found");

        var currentRoles = await _userManager.GetRolesAsync(user);
        await _userManager.RemoveFromRolesAsync(user, currentRoles);
        var addResult = await _userManager.AddToRolesAsync(user, request.RoleNames);
        if (!addResult.Succeeded)
        {
            return Result.Failure<UserDto>(string.Join(" ", addResult.Errors.Select(e => e.Description)), "identity_error");
        }

        await _auditLogger.LogAsync("AssignRoles", "Users", "User", user.Id.ToString(), currentRoles, request.RoleNames, ct: ct);

        return Result.Success(await ToDtoAsync(user));
    }

    private async Task<UserDto> ToDtoAsync(AppUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        return new UserDto(user.Id, user.Email!, user.FullName, user.PhoneNumber, user.IsActive, user.TenantId, roles.ToList(), user.CreatedAt, user.LastLoginAt);
    }
}

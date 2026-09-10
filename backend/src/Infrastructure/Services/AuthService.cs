using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RealEstateErp.Application.Auth;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Infrastructure.Identity;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly UserManager<AppUser> _userManager;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly JwtSettings _jwtSettings;
    private readonly IAuditLogger _auditLogger;

    public AuthService(AppDbContext db, UserManager<AppUser> userManager, IJwtTokenService jwtTokenService,
        IOptions<JwtSettings> jwtSettings, IAuditLogger auditLogger)
    {
        _db = db;
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
        _jwtSettings = jwtSettings.Value;
        _auditLogger = auditLogger;
    }

    public async Task<Result<AuthResult>> LoginAsync(string email, string password, string? ipAddress, CancellationToken ct = default)
    {
        var user = await _userManager.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.NormalizedEmail == email.ToUpperInvariant(), ct);

        if (user is null || !user.IsActive)
        {
            return Result.Failure<AuthResult>("Invalid email or password.", "invalid_credentials");
        }

        if (await _userManager.IsLockedOutAsync(user))
        {
            return Result.Failure<AuthResult>("Account is locked. Try again later.", "locked_out");
        }

        var passwordValid = await _userManager.CheckPasswordAsync(user, password);
        if (!passwordValid)
        {
            await _userManager.AccessFailedAsync(user);
            return Result.Failure<AuthResult>("Invalid email or password.", "invalid_credentials");
        }

        await _userManager.ResetAccessFailedCountAsync(user);
        user.LastLoginAt = DateTimeOffset.UtcNow;
        await _userManager.UpdateAsync(user);

        var authResult = await BuildAuthResultAsync(user, ipAddress, ct);

        await _auditLogger.LogAsync("Login", "Auth", "User", user.Id.ToString(),
            tenantIdOverride: user.TenantId, actorIdOverride: user.Id, actorEmailOverride: user.Email, ct: ct);

        return Result.Success(authResult);
    }

    public async Task<Result<AuthResult>> RefreshAsync(string refreshToken, string? ipAddress, CancellationToken ct = default)
    {
        var hash = _jwtTokenService.HashToken(refreshToken);
        var existing = await _db.RefreshTokens.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (existing is null || !existing.IsActive)
        {
            return Result.Failure<AuthResult>("Invalid or expired refresh token.", "invalid_refresh_token");
        }

        var user = await _userManager.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == existing.UserId, ct);
        if (user is null || !user.IsActive)
        {
            return Result.Failure<AuthResult>("Invalid or expired refresh token.", "invalid_refresh_token");
        }

        existing.RevokedAt = DateTimeOffset.UtcNow;
        var authResult = await BuildAuthResultAsync(user, ipAddress, ct);
        existing.ReplacedByTokenHash = _jwtTokenService.HashToken(authResult.RefreshToken);
        await _db.SaveChangesAsync(ct);

        return Result.Success(authResult);
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        var hash = _jwtTokenService.HashToken(refreshToken);
        var existing = await _db.RefreshTokens.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (existing is not null && existing.RevokedAt is null)
        {
            existing.RevokedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
    }

    private async Task<AuthResult> BuildAuthResultAsync(AppUser user, string? ipAddress, CancellationToken ct)
    {
        var roles = await _userManager.GetRolesAsync(user);

        var roleIds = await _db.Roles.IgnoreQueryFilters()
            .Where(r => roles.Contains(r.Name!))
            .Select(r => r.Id)
            .ToListAsync(ct);

        var permissions = await _db.RolePermissions.IgnoreQueryFilters()
            .Where(rp => roleIds.Contains(rp.RoleId))
            .Select(rp => rp.Permission!.Code)
            .Distinct()
            .ToListAsync(ct);

        var access = _jwtTokenService.GenerateAccessToken(user.Id, user.Email!, user.TenantId, roles, permissions);
        var refreshTokenValue = _jwtTokenService.GenerateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = _jwtTokenService.HashToken(refreshTokenValue),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(_jwtSettings.RefreshTokenDays),
            CreatedByIp = ipAddress
        });
        await _db.SaveChangesAsync(ct);

        string? tenantName = null;
        if (user.TenantId.HasValue)
        {
            tenantName = await _db.Tenants.IgnoreQueryFilters()
                .Where(t => t.Id == user.TenantId)
                .Select(t => t.Name)
                .FirstOrDefaultAsync(ct);
        }

        var profile = new UserProfileDto(
            user.Id, user.Email!, user.FullName, user.TenantId, tenantName,
            roles.Contains("Super Admin"), roles.ToList(), permissions);

        return new AuthResult(access.Token, access.ExpiresAt, refreshTokenValue, profile);
    }
}

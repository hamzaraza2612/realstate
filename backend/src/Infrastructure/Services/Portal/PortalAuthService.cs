using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Portal;
using RealEstateErp.Domain.Portal;
using RealEstateErp.Domain.Tenancy;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Infrastructure.Services;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Portal;

/// <summary>
/// Mirrors Infrastructure/Services/AuthService.cs's login/refresh/logout shape closely (same
/// tenant-status blocking, same refresh-token rotation-with-audit-trail pattern, same non-enumeration
/// convention for "invalid email or password") but against PortalUser instead of AppUser — see
/// PortalUser's own doc comment for why they're a separate table rather than one more AppUser role.
/// </summary>
public class PortalAuthService : IPortalAuthService
{
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);
    private const int MaxFailedAttempts = 5;

    private readonly AppDbContext _db;
    private readonly IPasswordHasher<PortalUser> _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly JwtSettings _jwtSettings;
    private readonly IAuditLogger _auditLogger;
    private readonly PortalActorResolver _actorResolver;
    private readonly PortalPasswordResetIssuer _resetIssuer;
    private readonly ITenantContext _tenantContext;
    private readonly IPortalContext _portalContext;

    public PortalAuthService(
        AppDbContext db, IPasswordHasher<PortalUser> passwordHasher, IJwtTokenService jwtTokenService,
        IOptions<JwtSettings> jwtSettings, IAuditLogger auditLogger,
        PortalActorResolver actorResolver, PortalPasswordResetIssuer resetIssuer,
        ITenantContext tenantContext, IPortalContext portalContext)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _jwtSettings = jwtSettings.Value;
        _auditLogger = auditLogger;
        _actorResolver = actorResolver;
        _resetIssuer = resetIssuer;
        _tenantContext = tenantContext;
        _portalContext = portalContext;
    }

    public async Task<Result<PortalAuthResult>> LoginAsync(string tenantSlug, string email, string password, string? ipAddress, CancellationToken ct = default)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Slug == tenantSlug, ct);
        if (tenant is null || !tenant.Status.IsUsable())
        {
            // Same message whether the org doesn't exist or isn't usable — don't reveal which.
            return Result.Failure<PortalAuthResult>("Invalid organization, email, or password.", "invalid_credentials");
        }

        var normalizedEmail = email.Trim().ToUpperInvariant();
        var user = await _db.PortalUsers.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.TenantId == tenant.Id && u.NormalizedEmail == normalizedEmail, ct);

        if (user is null || !user.IsActive)
        {
            return Result.Failure<PortalAuthResult>("Invalid organization, email, or password.", "invalid_credentials");
        }

        if (user.LockedOutUntil is { } lockedUntil && lockedUntil > DateTimeOffset.UtcNow)
        {
            return Result.Failure<PortalAuthResult>("Too many failed attempts. Try again later.", "locked_out");
        }

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verification == PasswordVerificationResult.Failed)
        {
            user.AccessFailedCount++;
            if (user.AccessFailedCount >= MaxFailedAttempts)
            {
                user.LockedOutUntil = DateTimeOffset.UtcNow.Add(LockoutDuration);
            }
            await _db.SaveChangesAsync(ct);
            return Result.Failure<PortalAuthResult>("Invalid organization, email, or password.", "invalid_credentials");
        }

        user.AccessFailedCount = 0;
        user.LockedOutUntil = null;
        user.LastLoginAt = DateTimeOffset.UtcNow;

        var authResult = await BuildAuthResultAsync(user, tenant, ipAddress, ct);

        await _auditLogger.LogAsync("PortalLogin", "Portal", "PortalUser", user.Id.ToString(),
            tenantIdOverride: tenant.Id, actorIdOverride: user.Id, actorEmailOverride: user.Email, ct: ct);

        return Result.Success(authResult);
    }

    public async Task<Result<PortalAuthResult>> RefreshAsync(string refreshToken, string? ipAddress, CancellationToken ct = default)
    {
        var hash = _jwtTokenService.HashToken(refreshToken);
        var existing = await _db.PortalRefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (existing is null || !existing.IsActive)
        {
            return Result.Failure<PortalAuthResult>("Invalid or expired refresh token.", "invalid_refresh_token");
        }

        var user = await _db.PortalUsers.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == existing.PortalUserId, ct);
        if (user is null || !user.IsActive)
        {
            return Result.Failure<PortalAuthResult>("Invalid or expired refresh token.", "invalid_refresh_token");
        }

        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == user.TenantId, ct);
        if (tenant is null || !tenant.Status.IsUsable())
        {
            existing.RevokedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
            return Result.Failure<PortalAuthResult>("This organization's account is not currently usable.", "tenant_unusable");
        }

        existing.RevokedAt = DateTimeOffset.UtcNow;
        var authResult = await BuildAuthResultAsync(user, tenant, ipAddress, ct);
        existing.ReplacedByTokenHash = _jwtTokenService.HashToken(authResult.RefreshToken);
        await _db.SaveChangesAsync(ct);

        return Result.Success(authResult);
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        var hash = _jwtTokenService.HashToken(refreshToken);
        var existing = await _db.PortalRefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (existing is not null && existing.RevokedAt is null)
        {
            existing.RevokedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task RequestPasswordResetAsync(string tenantSlug, string email, CancellationToken ct = default)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Slug == tenantSlug, ct);
        if (tenant is null) return;

        var normalizedEmail = email.Trim().ToUpperInvariant();
        var user = await _db.PortalUsers.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.TenantId == tenant.Id && u.NormalizedEmail == normalizedEmail, ct);
        if (user is null || !user.IsActive) return;

        await _resetIssuer.IssueAndEmailAsync(user, isInitialActivation: false, ct);
    }

    public async Task<Result> ResetPasswordAsync(string token, string newPassword, CancellationToken ct = default)
    {
        var hash = _jwtTokenService.HashToken(token);
        var resetToken = await _db.PortalPasswordResetTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (resetToken is null || !resetToken.IsActive)
        {
            return Result.Failure("This reset link is invalid or has expired.", "invalid_token");
        }

        var user = await _db.PortalUsers.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == resetToken.PortalUserId, ct);
        if (user is null)
        {
            return Result.Failure("This reset link is invalid or has expired.", "invalid_token");
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, newPassword);
        user.AccessFailedCount = 0;
        user.LockedOutUntil = null;
        resetToken.UsedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("PortalPasswordReset", "Portal", "PortalUser", user.Id.ToString(),
            tenantIdOverride: user.TenantId, actorIdOverride: user.Id, actorEmailOverride: user.Email, ct: ct);

        return Result.Success();
    }

    public async Task<Result<PortalUserProfileDto>> GetProfileAsync(CancellationToken ct = default)
    {
        if (_tenantContext.TenantId is not { } tenantId)
        {
            return Result.Failure<PortalUserProfileDto>("Not authenticated.", "unauthenticated");
        }

        var user = await _db.PortalUsers.FirstOrDefaultAsync(u => u.Id == _portalContext.PortalUserId, ct);
        if (user is null)
        {
            return Result.Failure<PortalUserProfileDto>("Not found.", "not_found");
        }

        var tenantName = await _db.Tenants.Where(t => t.Id == tenantId).Select(t => t.Name).FirstOrDefaultAsync(ct) ?? "";
        var actor = await _actorResolver.ResolveAsync(tenantId, user.ActorType, user.ActorId, ct);

        return Result.Success(new PortalUserProfileDto(user.Id, user.Email, user.ActorType, user.ActorId, actor.DisplayName, tenantId, tenantName));
    }

    private async Task<PortalAuthResult> BuildAuthResultAsync(PortalUser user, Tenant tenant, string? ipAddress, CancellationToken ct)
    {
        var access = _jwtTokenService.GeneratePortalAccessToken(user.Id, user.Email, tenant.Id, user.ActorType, user.ActorId);
        var refreshTokenValue = _jwtTokenService.GenerateRefreshToken();

        _db.PortalRefreshTokens.Add(new Domain.Portal.PortalRefreshToken
        {
            PortalUserId = user.Id,
            TokenHash = _jwtTokenService.HashToken(refreshTokenValue),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(_jwtSettings.RefreshTokenDays),
            CreatedByIp = ipAddress
        });
        await _db.SaveChangesAsync(ct);

        var actor = await _actorResolver.ResolveAsync(tenant.Id, user.ActorType, user.ActorId, ct);
        var profile = new PortalUserProfileDto(user.Id, user.Email, user.ActorType, user.ActorId, actor.DisplayName, tenant.Id, tenant.Name);

        return new PortalAuthResult(access.Token, access.ExpiresAt, refreshTokenValue, profile);
    }
}

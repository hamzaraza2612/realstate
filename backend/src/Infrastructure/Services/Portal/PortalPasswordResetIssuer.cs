using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Communication;
using RealEstateErp.Domain.Portal;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Portal;

/// <summary>
/// Shared by PortalAccountService.InviteAsync (new account, no usable password yet) and
/// PortalAuthService.RequestPasswordResetAsync (existing account) — the exact same token type and
/// email serve both "set your initial password" and "reset your forgotten password," so this is
/// written once rather than once per caller.
/// </summary>
public class PortalPasswordResetIssuer
{
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromHours(1);

    private readonly AppDbContext _db;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IEmailSender _emailSender;

    public PortalPasswordResetIssuer(AppDbContext db, IJwtTokenService jwtTokenService, IEmailSender emailSender)
    {
        _db = db;
        _jwtTokenService = jwtTokenService;
        _emailSender = emailSender;
    }

    public async Task IssueAndEmailAsync(PortalUser user, bool isInitialActivation, CancellationToken ct)
    {
        var rawToken = _jwtTokenService.GenerateRefreshToken();
        _db.PortalPasswordResetTokens.Add(new PortalPasswordResetToken
        {
            PortalUserId = user.Id,
            TokenHash = _jwtTokenService.HashToken(rawToken),
            ExpiresAt = DateTimeOffset.UtcNow.Add(TokenLifetime)
        });
        await _db.SaveChangesAsync(ct);

        var subject = isInitialActivation ? "Activate your portal account" : "Reset your portal password";
        var body = isInitialActivation
            ? $"An account was created for you. Use this code to set your password (valid 1 hour): {rawToken}"
            : $"Use this code to reset your password (valid 1 hour): {rawToken}";

        // Called directly (not through ICommunicationService) — that abstraction resolves its
        // recipient's email via the AppUser table, which a PortalUser row is never part of.
        await _emailSender.SendAsync(user.Email, subject, body, ct);
    }
}

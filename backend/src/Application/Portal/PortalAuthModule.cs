using FluentValidation;

namespace RealEstateErp.Application.Portal;

public record PortalUserProfileDto(
    Guid Id, string Email, string ActorType, Guid ActorId, string DisplayName,
    Guid TenantId, string TenantName);

public record PortalAuthResult(string AccessToken, DateTimeOffset AccessTokenExpiresAt, string RefreshToken, PortalUserProfileDto Profile);

public record PortalLoginRequest(string TenantSlug, string Email, string Password);

public record PortalRequestPasswordResetRequest(string TenantSlug, string Email);

public record PortalResetPasswordRequest(string Token, string NewPassword);

public interface IPortalAuthService
{
    Task<Shared.Common.Result<PortalAuthResult>> LoginAsync(string tenantSlug, string email, string password, string? ipAddress, CancellationToken ct = default);
    Task<Shared.Common.Result<PortalAuthResult>> RefreshAsync(string refreshToken, string? ipAddress, CancellationToken ct = default);
    Task LogoutAsync(string refreshToken, CancellationToken ct = default);

    /// <summary>Always succeeds regardless of whether the email matches an account, to avoid leaking
    /// which emails have portal access (the same non-enumeration convention as internal password
    /// reset would use, applied here from the start since this is the first portal-facing surface).</summary>
    Task RequestPasswordResetAsync(string tenantSlug, string email, CancellationToken ct = default);

    Task<Shared.Common.Result> ResetPasswordAsync(string token, string newPassword, CancellationToken ct = default);

    Task<Shared.Common.Result<PortalUserProfileDto>> GetProfileAsync(CancellationToken ct = default);
}

public class PortalLoginRequestValidator : AbstractValidator<PortalLoginRequest>
{
    public PortalLoginRequestValidator()
    {
        RuleFor(x => x.TenantSlug).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class PortalRequestPasswordResetRequestValidator : AbstractValidator<PortalRequestPasswordResetRequest>
{
    public PortalRequestPasswordResetRequestValidator()
    {
        RuleFor(x => x.TenantSlug).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}

public class PortalResetPasswordRequestValidator : AbstractValidator<PortalResetPasswordRequest>
{
    public PortalResetPasswordRequestValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8);
    }
}

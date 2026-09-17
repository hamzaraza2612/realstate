namespace RealEstateErp.Application.Auth;

public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record AuthResult(string AccessToken, DateTimeOffset AccessTokenExpiresAt, string RefreshToken, UserProfileDto User);

public record UserProfileDto(
    Guid Id,
    string Email,
    string FullName,
    Guid? TenantId,
    string? TenantName,
    bool IsSuperAdmin,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions);

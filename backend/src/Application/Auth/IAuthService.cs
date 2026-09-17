using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Auth;

public interface IAuthService
{
    Task<Result<AuthResult>> LoginAsync(string email, string password, string? ipAddress, CancellationToken ct = default);
    Task<Result<AuthResult>> RefreshAsync(string refreshToken, string? ipAddress, CancellationToken ct = default);
    Task LogoutAsync(string refreshToken, CancellationToken ct = default);
}

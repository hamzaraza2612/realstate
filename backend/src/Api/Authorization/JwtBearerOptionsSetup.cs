using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using RealEstateErp.Infrastructure.Services;

namespace RealEstateErp.Api.Authorization;

/// <summary>
/// Resolves JwtBearerOptions from IOptions&lt;JwtSettings&gt; at the time the handler actually
/// needs them (first authenticated request), rather than baking the signing key into a closure
/// over a value read from IConfiguration during Program.cs's synchronous startup. That earlier
/// approach broke under WebApplicationFactory-based integration tests, whose configuration
/// overrides are applied to the host after Program.cs's top-level code has already run — the
/// closure would silently keep the empty default secret. Binding lazily through IOptions avoids
/// that class of bug entirely and is also the more correct pattern in production.
/// </summary>
public class JwtBearerOptionsSetup : IConfigureNamedOptions<JwtBearerOptions>
{
    private readonly JwtSettings _settings;

    public JwtBearerOptionsSetup(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;
    }

    public void Configure(string? name, JwtBearerOptions options) => Configure(options);

    public void Configure(JwtBearerOptions options)
    {
        if (string.IsNullOrEmpty(_settings.Secret))
        {
            throw new InvalidOperationException("Jwt:Secret is not configured.");
        }

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = _settings.Issuer,
            ValidateAudience = true,
            ValidAudience = _settings.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    }
}

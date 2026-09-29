using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using RealEstateErp.Application.Ai;
using RealEstateErp.IntegrationTests.Ai;

namespace RealEstateErp.IntegrationTests;

/// <summary>
/// Runs the real API pipeline (auth, authorization, EF Core tenant filters) against a dedicated
/// Postgres test database — not InMemory, since tenant query filters and identity behavior need
/// to be exercised against the real provider to mean anything.
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = "Host=localhost;Port=5432;Database=realestate_erp_test;Username=postgres;Password=postgres",
                ["Jwt:Secret"] = "test-only-secret-key-for-integration-tests-32chars-min",
                ["Jwt:Issuer"] = "RealEstateErp",
                ["Jwt:Audience"] = "RealEstateErpClient",
                ["SuperAdmin:Email"] = "superadmin@realestate-erp.local",
                ["SuperAdmin:Password"] = "ChangeMe@123",
                ["SeedDemoData"] = "false",
                ["Storage:LocalPath"] = Path.Combine(Path.GetTempPath(), "realestate-erp-test-uploads")
            });
        });

        // No ANTHROPIC_API_KEY exists in this sandbox, so Ai:Enabled is deliberately left unset above
        // (DependencyInjection would fall back to UnconfiguredAiProvider). Every AI test instead runs
        // against this single deterministic, scripted double — see FakeAiProvider's own doc comment.
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IAiProvider>();
            services.AddSingleton<IAiProvider, FakeAiProvider>();
        });
    }
}

using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using RealEstateErp.Domain.Tenancy;
using RealEstateErp.Infrastructure.Identity;
using RealEstateErp.Infrastructure.Services.Finance;

namespace RealEstateErp.Infrastructure.Persistence;

/// <summary>
/// Optional demo tenant for evaluation/sales demos. Only runs when SeedDemoData=true. Extended by
/// each module as it ships (CRM leads, projects/inventory, bookings, etc.) — kept separate from
/// DbSeeder so production deployments never need to touch this file.
/// </summary>
public static class DemoDataSeeder
{
    private const string DemoSlug = "acme-builders";

    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var userManager = services.GetRequiredService<UserManager<AppUser>>();
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("DemoDataSeeder");

        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == DemoSlug);
        if (tenant is null)
        {
            tenant = new Tenant
            {
                Name = "Acme Builders & Developers",
                Slug = DemoSlug,
                Status = TenantStatus.Active,
                Timezone = "Asia/Karachi",
                ContactEmail = "info@acme-builders.demo"
            };
            db.Tenants.Add(tenant);
            await db.SaveChangesAsync();
            logger.LogInformation("Seeded demo tenant '{Name}'.", tenant.Name);
        }

        await SystemAccountSeeder.SeedAsync(db, tenant.Id);
        await db.SaveChangesAsync();

        await SeedDemoUserAsync(userManager, tenant.Id, "owner@acme-builders.demo", "Demo Owner", "Organization Owner", logger);
        await SeedDemoUserAsync(userManager, tenant.Id, "sales.manager@acme-builders.demo", "Demo Sales Manager", "Sales Manager", logger);
        await SeedDemoUserAsync(userManager, tenant.Id, "agent@acme-builders.demo", "Demo Sales Agent", "Sales Agent", logger);
    }

    private static async Task SeedDemoUserAsync(UserManager<AppUser> userManager, Guid tenantId, string email, string fullName, string role, ILogger logger)
    {
        var existing = await userManager.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.NormalizedEmail == email.ToUpperInvariant());
        if (existing is not null) return;

        var user = new AppUser
        {
            Email = email,
            UserName = email,
            FullName = fullName,
            TenantId = tenantId,
            EmailConfirmed = true,
            IsActive = true
        };

        var result = await userManager.CreateAsync(user, "Demo@12345");
        if (result.Succeeded)
        {
            await userManager.AddToRoleAsync(user, role);
            logger.LogInformation("Seeded demo user {Email} with role {Role}.", email, role);
        }
    }
}

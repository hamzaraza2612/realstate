using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using RealEstateErp.Domain.Tenancy;
using RealEstateErp.Infrastructure.Identity;
using RealEstateErp.Shared.Security;

namespace RealEstateErp.Infrastructure.Persistence;

/// <summary>
/// Seeds: the full permission catalog, system role templates (with their default permission
/// bundles), and a Super Admin account. Optionally seeds a demo tenant + org owner when
/// SeedDemoData=true in configuration. Never runs destructive operations on existing data.
/// </summary>
public static class DbSeeder
{
    private static readonly Dictionary<string, string[]> SystemRolePermissions = new()
    {
        ["Super Admin"] = Permissions.All.ToArray(),
        ["Organization Owner"] = Permissions.All.Where(p => !p.StartsWith("platform.")).ToArray(),
        ["Organization Admin"] = Permissions.All.Where(p => !p.StartsWith("platform.") && p != Permissions.Roles.Manage).ToArray(),
        ["Finance Manager"] = new[] { Permissions.Finance.InvoiceCreate, Permissions.Finance.PaymentApprove, Permissions.Finance.ReportsView, Permissions.Sales.PaymentRecord, Permissions.AuditLogs.View, Permissions.Reports.View },
        ["Sales Manager"] = new[] { Permissions.Sales.BookingView, Permissions.Sales.BookingCreate, Permissions.Sales.BookingApprove, Permissions.Sales.BookingCancel, Permissions.Sales.PaymentRecord, Permissions.Crm.LeadView, Permissions.Crm.LeadCreate, Permissions.Crm.LeadUpdate, Permissions.Crm.LeadAssign, Permissions.Crm.LeadDelete, Permissions.Crm.CustomerView, Permissions.Crm.CustomerManage, Permissions.Crm.ActivityView, Permissions.Crm.ActivityManage, Permissions.Reports.View },
        ["Sales Agent"] = new[] { Permissions.Crm.LeadView, Permissions.Crm.LeadCreate, Permissions.Crm.LeadUpdate, Permissions.Crm.CustomerView, Permissions.Crm.ActivityView, Permissions.Crm.ActivityManage, Permissions.Sales.BookingView, Permissions.Sales.BookingCreate, Permissions.Sales.PaymentRecord },
        ["Project Manager"] = new[] { Permissions.Projects.View, Permissions.Projects.Manage, Permissions.Inventory.View, Permissions.Inventory.Manage, Permissions.Reports.View },
        ["Construction Manager"] = new[] { Permissions.Construction.ProjectManage, Permissions.Projects.View, Permissions.Reports.View },
        ["Procurement Officer"] = new[] { Permissions.Procurement.RequestCreate, Permissions.Procurement.OrderApprove },
        ["Property Manager"] = new[] { Permissions.Property.LeaseManage, Permissions.Inventory.View, Permissions.Reports.View },
        ["Facility Manager"] = new[] { Permissions.Facility.WorkOrderManage, Permissions.Reports.View },
        ["Accountant"] = new[] { Permissions.Finance.InvoiceCreate, Permissions.Finance.PaymentApprove, Permissions.Finance.ReportsView, Permissions.Reports.View },
        ["HR Manager"] = new[] { Permissions.Hr.EmployeeManage },
        ["Customer"] = Array.Empty<string>(),
        ["Member"] = Array.Empty<string>(),
        ["Tenant"] = Array.Empty<string>(),
        ["Vendor"] = Array.Empty<string>(),
    };

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<AppRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DbSeeder");

        await db.Database.MigrateAsync();

        await SeedPermissionsAsync(db);
        await SeedSystemRolesAsync(db, roleManager);
        await SeedSuperAdminAsync(userManager, config, logger);

        if (config.GetValue<bool>("SeedDemoData"))
        {
            await DemoDataSeeder.SeedAsync(scope.ServiceProvider);
        }
    }

    private static async Task SeedPermissionsAsync(AppDbContext db)
    {
        var existingCodes = await db.Permissions.Select(p => p.Code).ToListAsync();
        var missing = Permissions.All.Except(existingCodes).ToList();
        if (missing.Count == 0) return;

        foreach (var code in missing)
        {
            var module = code.Split('.')[0];
            db.Permissions.Add(new Identity.Permission { Code = code, Module = module });
        }
        await db.SaveChangesAsync();
    }

    private static async Task SeedSystemRolesAsync(AppDbContext db, RoleManager<AppRole> roleManager)
    {
        foreach (var (roleName, permissionCodes) in SystemRolePermissions)
        {
            var role = await roleManager.FindByNameAsync(roleName);
            if (role is null)
            {
                role = new AppRole { Name = roleName, TenantId = null, IsSystem = true, Description = $"System role: {roleName}" };
                await roleManager.CreateAsync(role);
            }

            var permissionIds = await db.Permissions.Where(p => permissionCodes.Contains(p.Code)).Select(p => p.Id).ToListAsync();
            var existingAssignments = await db.RolePermissions.Where(rp => rp.RoleId == role.Id).Select(rp => rp.PermissionId).ToListAsync();
            var toAdd = permissionIds.Except(existingAssignments);

            foreach (var permissionId in toAdd)
            {
                db.RolePermissions.Add(new Identity.RolePermission { RoleId = role.Id, PermissionId = permissionId });
            }
        }
        await db.SaveChangesAsync();
    }

    private static async Task SeedSuperAdminAsync(UserManager<AppUser> userManager, IConfiguration config, ILogger logger)
    {
        var email = config["SuperAdmin:Email"] ?? "superadmin@realestate-erp.local";
        var existing = await userManager.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.NormalizedEmail == email.ToUpperInvariant());
        if (existing is not null) return;

        var password = config["SuperAdmin:Password"];
        if (string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("SuperAdmin:Password not configured; skipping Super Admin bootstrap. Set it via environment variable SuperAdmin__Password.");
            return;
        }

        var user = new AppUser
        {
            Email = email,
            UserName = email,
            FullName = "Platform Super Admin",
            TenantId = null,
            EmailConfirmed = true,
            IsActive = true
        };

        var result = await userManager.CreateAsync(user, password);
        if (result.Succeeded)
        {
            await userManager.AddToRoleAsync(user, "Super Admin");
            logger.LogInformation("Seeded Super Admin account {Email}.", email);
        }
        else
        {
            logger.LogError("Failed to seed Super Admin: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
        }
    }
}

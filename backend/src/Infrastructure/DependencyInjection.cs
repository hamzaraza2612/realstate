using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RealEstateErp.Application.AuditLogs;
using RealEstateErp.Application.Auth;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Crm.Activities;
using RealEstateErp.Application.Crm.Customers;
using RealEstateErp.Application.Crm.Dashboard;
using RealEstateErp.Application.Crm.Leads;
using RealEstateErp.Application.Finance;
using RealEstateErp.Application.Finance.Accounts;
using RealEstateErp.Application.Finance.Dashboard;
using RealEstateErp.Application.Finance.Journal;
using RealEstateErp.Application.Finance.Receivables;
using RealEstateErp.Application.Finance.Reports;
using RealEstateErp.Application.Inventory;
using RealEstateErp.Application.Organizations;
using RealEstateErp.Application.Projects.Hierarchy;
using RealEstateErp.Application.Projects.Projects;
using RealEstateErp.Application.Roles;
using RealEstateErp.Application.Sales.Bookings;
using RealEstateErp.Application.Sales.Dashboard;
using RealEstateErp.Application.Sales.PaymentPlans;
using RealEstateErp.Application.Sales.Payments;
using RealEstateErp.Application.Subscription;
using RealEstateErp.Application.Users;
using RealEstateErp.Infrastructure.Identity;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Infrastructure.Services;
using RealEstateErp.Infrastructure.Services.Crm;
using RealEstateErp.Infrastructure.Services.Finance;
using RealEstateErp.Infrastructure.Services.Inventory;
using RealEstateErp.Infrastructure.Services.Projects;
using RealEstateErp.Infrastructure.Services.Sales;

namespace RealEstateErp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Connection string is resolved lazily from IConfiguration via the service provider (not read
        // once into a local here) so that configuration overrides applied after this call — e.g. by
        // WebApplicationFactory in integration tests, or any config-reload source — are honored. Program.cs's
        // top-level code runs before those overrides reach `configuration`, so capturing the value eagerly
        // into a closure would silently pin it to whatever was configured before this method ran.
        static string GetConnectionString(IServiceProvider sp) =>
            sp.GetRequiredService<IConfiguration>().GetConnectionString("Default")
                ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

        services.AddDbContext<AppDbContext>((sp, options) =>
            options.UseNpgsql(GetConnectionString(sp), npgsql => npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)));

        services.AddIdentity<AppUser, AppRole>(options =>
            {
                options.Password.RequiredLength = 8;
                options.Password.RequireNonAlphanumeric = false;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.User.RequireUniqueEmail = true;
            })
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));

        services.AddHttpContextAccessor();
        services.AddScoped<ITenantContext, TenantContext>();
        services.AddScoped<IAuditLogger, AuditLogger>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IRoleService, RoleService>();
        services.AddScoped<IOrganizationService, OrganizationService>();
        services.AddScoped<IAuditLogQueryService, AuditLogQueryService>();
        services.AddScoped<ISubscriptionPlanService, SubscriptionPlanService>();
        services.AddScoped<ILeadService, LeadService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IActivityService, ActivityService>();
        services.AddScoped<ICrmDashboardService, CrmDashboardService>();
        services.AddScoped<IProjectService, ProjectService>();
        services.AddScoped<IProjectNodeService, ProjectNodeService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IBookingService, BookingService>();
        services.AddScoped<IPaymentPlanService, PaymentPlanService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<ISalesDashboardService, SalesDashboardService>();
        services.AddScoped<ISalesPaymentPostingService, SalesPaymentPostingService>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<IJournalService, JournalService>();
        services.AddScoped<IReceivableService, ReceivableService>();
        services.AddScoped<IFinanceDashboardService, FinanceDashboardService>();
        services.AddScoped<IFinanceReportService, FinanceReportService>();

        services.AddHangfire((sp, config) => config
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UsePostgreSqlStorage(opts => opts.UseNpgsqlConnection(GetConnectionString(sp))));
        services.AddHangfireServer();

        return services;
    }
}

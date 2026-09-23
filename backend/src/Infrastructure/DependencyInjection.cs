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
using RealEstateErp.Application.Construction.Dashboard;
using RealEstateErp.Application.Construction.Expenses;
using RealEstateErp.Application.Construction.Tasks;
using RealEstateErp.Application.Construction.WorkPackages;
using RealEstateErp.Application.Crm.Leads;
using RealEstateErp.Application.Facility.Dashboard;
using RealEstateErp.Application.Facility.Facilities;
using RealEstateErp.Application.Facility.Payments;
using RealEstateErp.Application.Facility.ServiceRequests;
using RealEstateErp.Application.Facility.Spaces;
using RealEstateErp.Application.Facility.Utilities;
using RealEstateErp.Application.Facility.Mall;
using RealEstateErp.Application.Facility.Coworking;
using ICoworkingBookingService = RealEstateErp.Application.Facility.Coworking.IBookingService;
using ISalesBookingService = RealEstateErp.Application.Sales.Bookings.IBookingService;
using RealEstateErp.Application.Finance;
using RealEstateErp.Application.Finance.Accounts;
using RealEstateErp.Application.Finance.Dashboard;
using RealEstateErp.Application.Finance.FiscalPeriods;
using RealEstateErp.Application.Finance.Journal;
using RealEstateErp.Application.Finance.Receivables;
using RealEstateErp.Application.Finance.Reports;
using RealEstateErp.Application.Inventory;
using RealEstateErp.Application.Materials;
using RealEstateErp.Application.Organizations;
using RealEstateErp.Application.Procurement.Dashboard;
using RealEstateErp.Application.Procurement.PurchaseOrders;
using RealEstateErp.Application.Procurement.PurchaseRequests;
using RealEstateErp.Application.Procurement.Receiving;
using RealEstateErp.Application.Procurement.Vendors;
using RealEstateErp.Application.Property.Dashboard;
using RealEstateErp.Application.Property.Leases;
using RealEstateErp.Application.Property.Maintenance;
using RealEstateErp.Application.Property.Payments;
using RealEstateErp.Application.Property.Properties;
using RealEstateErp.Application.Property.RentalDashboard;
using RealEstateErp.Application.Property.RentSchedules;
using RealEstateErp.Application.Property.SecurityDeposits;
using RealEstateErp.Application.Property.Tenants;
using RealEstateErp.Application.Property.Units;
using RealEstateErp.Application.Projects.Hierarchy;
using RealEstateErp.Application.Projects.Projects;
using RealEstateErp.Application.Reporting.Construction;
using RealEstateErp.Application.Reporting.Executive;
using RealEstateErp.Application.Reporting.Facility;
using RealEstateErp.Application.Reporting.Finance;
using RealEstateErp.Application.Reporting.Procurement;
using RealEstateErp.Application.Reporting.Projects;
using RealEstateErp.Application.Reporting.Property;
using RealEstateErp.Application.Reporting.Sales;
using RealEstateErp.Application.Portal;
using RealEstateErp.Application.Property.Owners;
using RealEstateErp.Application.Roles;
using RealEstateErp.Application.Sales.Bookings;
using RealEstateErp.Application.Approvals;
using RealEstateErp.Application.Communication;
using RealEstateErp.Application.Documents;
using RealEstateErp.Application.Notifications;
using RealEstateErp.Application.Sales.Dashboard;
using RealEstateErp.Application.Sales.PaymentPlans;
using RealEstateErp.Application.Sales.Payments;
using RealEstateErp.Application.Subscription;
using RealEstateErp.Application.Users;
using RealEstateErp.Infrastructure.Identity;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Infrastructure.Services;
using RealEstateErp.Infrastructure.Services.Approvals;
using RealEstateErp.Infrastructure.Services.Communication;
using RealEstateErp.Infrastructure.Services.Construction;
using RealEstateErp.Infrastructure.Services.Crm;
using RealEstateErp.Infrastructure.Services.Documents;
using RealEstateErp.Infrastructure.Services.Facility;
using RealEstateErp.Infrastructure.Services.Facility.Mall;
using RealEstateErp.Infrastructure.Services.Facility.Coworking;
using RealEstateErp.Infrastructure.Services.Notifications;
using CoworkingBookingService = RealEstateErp.Infrastructure.Services.Facility.Coworking.BookingService;
using SalesBookingService = RealEstateErp.Infrastructure.Services.Sales.BookingService;
using RealEstateErp.Infrastructure.Services.Finance;
using RealEstateErp.Infrastructure.Services.Inventory;
using RealEstateErp.Infrastructure.Services.Materials;
using RealEstateErp.Infrastructure.Services.Procurement;
using RealEstateErp.Infrastructure.Services.Property;
using RealEstateErp.Infrastructure.Services.Projects;
using RealEstateErp.Infrastructure.Services.Portal;
using RealEstateErp.Infrastructure.Services.Reporting;
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
        services.AddScoped<IPortalContext, PortalContext>();
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
        services.AddScoped<ISalesBookingService, SalesBookingService>();
        services.AddScoped<IPaymentPlanService, PaymentPlanService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<ISalesDashboardService, SalesDashboardService>();
        services.AddScoped<ISalesPaymentPostingService, SalesPaymentPostingService>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<IJournalService, JournalService>();
        services.AddScoped<IReceivableService, ReceivableService>();
        services.AddScoped<IFinanceDashboardService, FinanceDashboardService>();
        services.AddScoped<IFinanceReportService, FinanceReportService>();
        services.AddScoped<IFiscalPeriodService, FiscalPeriodService>();
        services.AddScoped<IWorkPackageService, WorkPackageService>();
        services.AddScoped<IConstructionTaskService, ConstructionTaskService>();
        services.AddScoped<IExpenseService, ExpenseService>();
        services.AddScoped<IConstructionDashboardService, ConstructionDashboardService>();
        services.AddScoped<IConstructionFinancePostingService, ConstructionFinancePostingService>();
        services.AddScoped<IVendorService, VendorService>();
        services.AddScoped<IPurchaseRequestService, PurchaseRequestService>();
        services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();
        services.AddScoped<IReceiptService, ReceiptService>();
        services.AddScoped<IProcurementDashboardService, ProcurementDashboardService>();
        services.AddScoped<IMaterialService, MaterialService>();
        services.AddScoped<IPropertyService, PropertyService>();
        services.AddScoped<IPropertyUnitService, PropertyUnitService>();
        services.AddScoped<IRentalTenantService, RentalTenantService>();
        services.AddScoped<ILeaseService, LeaseService>();
        services.AddScoped<IRentScheduleService, RentScheduleService>();
        services.AddScoped<IRentPaymentService, RentPaymentService>();
        services.AddScoped<ISecurityDepositService, SecurityDepositService>();
        services.AddScoped<IMaintenanceService, MaintenanceService>();
        services.AddScoped<IPropertyDashboardService, PropertyDashboardService>();
        services.AddScoped<IRentalDashboardService, RentalDashboardService>();
        services.AddScoped<IRentalPaymentPostingService, RentalPaymentPostingService>();
        services.AddScoped<IFacilityService, FacilityService>();
        services.AddScoped<ISpaceService, SpaceService>();
        services.AddScoped<IUtilityReadingService, UtilityReadingService>();
        services.AddScoped<IServiceRequestService, ServiceRequestService>();
        services.AddScoped<IFacilityPaymentService, FacilityPaymentService>();
        services.AddScoped<IFacilityDashboardService, FacilityDashboardService>();
        services.AddScoped<IFacilityFinancePostingService, FacilityFinancePostingService>();
        services.AddScoped<IMallShopService, MallShopService>();
        services.AddScoped<IServiceChargeService, ServiceChargeService>();
        services.AddScoped<IParkingService, ParkingService>();
        services.AddScoped<IFacilityEventService, FacilityEventService>();
        services.AddScoped<ITenantNoticeService, TenantNoticeService>();
        services.AddScoped<IMallDashboardService, MallDashboardService>();
        services.AddScoped<ICoworkingMemberService, CoworkingMemberService>();
        services.AddScoped<IMembershipPlanService, MembershipPlanService>();
        services.AddScoped<IMembershipService, MembershipService>();
        services.AddScoped<IDeskService, DeskService>();
        services.AddScoped<IMeetingRoomService, MeetingRoomService>();
        services.AddScoped<ICoworkingBookingService, CoworkingBookingService>();
        services.AddScoped<ICoworkingDashboardService, CoworkingDashboardService>();
        services.AddSingleton<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<IDocumentService, DocumentService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<INotificationPreferenceService, NotificationPreferenceService>();
        services.AddScoped<IEmailSender, LoggingEmailSender>();
        services.AddScoped<ICommunicationService, CommunicationService>();
        services.AddScoped<ICommunicationLogQueryService, CommunicationLogQueryService>();
        services.AddScoped<IApprovalService, ApprovalService>();
        services.AddScoped<IApprovalLinkedEntityHandler, ExpenseApprovalHandler>();
        services.AddScoped<IApprovalLinkedEntityHandler, PurchaseOrderApprovalHandler>();
        services.AddScoped<IApprovalLinkedEntityHandler, BookingApprovalHandler>();

        services.AddScoped<IExecutiveDashboardService, ExecutiveDashboardService>();
        services.AddScoped<ISalesReportService, SalesReportService>();
        services.AddScoped<IFinanceReportsExtensionService, FinanceReportsExtensionService>();
        services.AddScoped<IProjectReportService, ProjectReportService>();
        services.AddScoped<IConstructionReportService, ConstructionReportService>();
        services.AddScoped<IProcurementReportService, ProcurementReportService>();
        services.AddScoped<IPropertyReportService, PropertyReportService>();
        services.AddScoped<IFacilityReportService, FacilityReportService>();

        services.AddScoped<IPasswordHasher<Domain.Portal.PortalUser>, PasswordHasher<Domain.Portal.PortalUser>>();
        services.AddScoped<PortalActorResolver>();
        services.AddScoped<PortalPasswordResetIssuer>();
        services.AddScoped<IPortalAuthService, PortalAuthService>();
        services.AddScoped<IPortalAccountService, PortalAccountService>();
        services.AddScoped<IPropertyOwnerService, PropertyOwnerService>();
        services.AddScoped<IPortalCustomerService, PortalCustomerService>();
        services.AddScoped<IPortalTenantService, PortalTenantService>();
        services.AddScoped<IPortalOwnerService, PortalOwnerService>();
        services.AddScoped<IPortalVendorService, PortalVendorService>();
        services.AddScoped<IPortalMemberService, PortalMemberService>();
        services.AddSingleton<IPortalPaymentIntentProvider, UnconfiguredPortalPaymentIntentProvider>();
        services.AddScoped<IAgentPortalService, AgentPortalService>();

        services.AddHangfire((sp, config) => config
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UsePostgreSqlStorage(opts => opts.UseNpgsqlConnection(GetConnectionString(sp))));
        services.AddHangfireServer();

        return services;
    }
}

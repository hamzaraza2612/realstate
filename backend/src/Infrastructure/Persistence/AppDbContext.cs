using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Domain.Administration;
using RealEstateErp.Domain.Construction;
using RealEstateErp.Domain.Crm;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Domain.Facility.Mall;
using CoworkingBooking = RealEstateErp.Domain.Facility.Coworking.Booking;
using CoworkingMember = RealEstateErp.Domain.Facility.Coworking.CoworkingMember;
using Desk = RealEstateErp.Domain.Facility.Coworking.Desk;
using MeetingRoom = RealEstateErp.Domain.Facility.Coworking.MeetingRoom;
using Membership = RealEstateErp.Domain.Facility.Coworking.Membership;
using MembershipPlan = RealEstateErp.Domain.Facility.Coworking.MembershipPlan;
using RealEstateErp.Domain.Finance;
using RealEstateErp.Domain.Materials;
using RealEstateErp.Domain.Procurement;
using RealEstateErp.Domain.Projects;
using RealEstateErp.Domain.Property;
using RealEstateErp.Domain.Sales;
using RealEstateErp.Domain.Subscription;
using RealEstateErp.Domain.Tenancy;
using RealEstateErp.Infrastructure.Identity;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<AppUser, AppRole, Guid>
{
    private readonly ITenantContext _tenantContext;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext) : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<PlanFeature> PlanFeatures => Set<PlanFeature>();
    public DbSet<TenantFeatureEntitlement> TenantFeatureEntitlements => Set<TenantFeatureEntitlement>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Lead> Leads => Set<Lead>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectNode> ProjectNodes => Set<ProjectNode>();
    public DbSet<InventoryUnit> InventoryUnits => Set<InventoryUnit>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<PaymentPlan> PaymentPlans => Set<PaymentPlan>();
    public DbSet<Installment> Installments => Set<Installment>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalLine> JournalLines => Set<JournalLine>();
    public DbSet<FinancialDocument> FinancialDocuments => Set<FinancialDocument>();
    public DbSet<FiscalPeriod> FiscalPeriods => Set<FiscalPeriod>();
    public DbSet<WorkPackage> WorkPackages => Set<WorkPackage>();
    public DbSet<ConstructionTask> ConstructionTasks => Set<ConstructionTask>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<ExpensePayment> ExpensePayments => Set<ExpensePayment>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<PurchaseRequest> PurchaseRequests => Set<PurchaseRequest>();
    public DbSet<PurchaseRequestLine> PurchaseRequestLines => Set<PurchaseRequestLine>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderLine> PurchaseOrderLines => Set<PurchaseOrderLine>();
    public DbSet<MaterialReceipt> MaterialReceipts => Set<MaterialReceipt>();
    public DbSet<MaterialReceiptLine> MaterialReceiptLines => Set<MaterialReceiptLine>();
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<PropertyUnit> PropertyUnits => Set<PropertyUnit>();
    public DbSet<RentalTenant> RentalTenants => Set<RentalTenant>();
    public DbSet<Lease> Leases => Set<Lease>();
    public DbSet<RentSchedule> RentSchedules => Set<RentSchedule>();
    public DbSet<RentPayment> RentPayments => Set<RentPayment>();
    public DbSet<SecurityDeposit> SecurityDeposits => Set<SecurityDeposit>();
    public DbSet<MaintenanceRequest> MaintenanceRequests => Set<MaintenanceRequest>();
    public DbSet<Facility> Facilities => Set<Facility>();
    public DbSet<Space> Spaces => Set<Space>();
    public DbSet<UtilityReading> UtilityReadings => Set<UtilityReading>();
    public DbSet<ServiceRequest> FacilityServiceRequests => Set<ServiceRequest>();
    public DbSet<FacilityPayment> FacilityPayments => Set<FacilityPayment>();
    public DbSet<MallShopProfile> MallShopProfiles => Set<MallShopProfile>();
    public DbSet<ServiceChargeDefinition> ServiceChargeDefinitions => Set<ServiceChargeDefinition>();
    public DbSet<ServiceChargeCharge> ServiceChargeCharges => Set<ServiceChargeCharge>();
    public DbSet<ParkingSpace> ParkingSpaces => Set<ParkingSpace>();
    public DbSet<ParkingAllocation> ParkingAllocations => Set<ParkingAllocation>();
    public DbSet<FacilityEvent> FacilityEvents => Set<FacilityEvent>();
    public DbSet<TenantNotice> TenantNotices => Set<TenantNotice>();
    public DbSet<CoworkingMember> CoworkingMembers => Set<CoworkingMember>();
    public DbSet<MembershipPlan> MembershipPlans => Set<MembershipPlan>();
    public DbSet<Membership> Memberships => Set<Membership>();
    public DbSet<Desk> Desks => Set<Desk>();
    public DbSet<MeetingRoom> MeetingRooms => Set<MeetingRoom>();
    public DbSet<CoworkingBooking> CoworkingBookings => Set<CoworkingBooking>();
    public DbSet<Domain.Documents.Document> Documents => Set<Domain.Documents.Document>();
    public DbSet<Domain.Documents.DocumentVersion> DocumentVersions => Set<Domain.Documents.DocumentVersion>();
    public DbSet<Domain.Notifications.Notification> Notifications => Set<Domain.Notifications.Notification>();
    public DbSet<Domain.Notifications.NotificationPreference> NotificationPreferences => Set<Domain.Notifications.NotificationPreference>();
    public DbSet<Domain.Communication.CommunicationLog> CommunicationLogs => Set<Domain.Communication.CommunicationLog>();
    public DbSet<Domain.Approvals.ApprovalRequest> ApprovalRequests => Set<Domain.Approvals.ApprovalRequest>();
    public DbSet<Domain.Portal.PortalUser> PortalUsers => Set<Domain.Portal.PortalUser>();
    public DbSet<Domain.Portal.PortalRefreshToken> PortalRefreshTokens => Set<Domain.Portal.PortalRefreshToken>();
    public DbSet<Domain.Portal.PortalPasswordResetToken> PortalPasswordResetTokens => Set<Domain.Portal.PortalPasswordResetToken>();
    public DbSet<PropertyOwner> PropertyOwners => Set<PropertyOwner>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        ApplyTenantQueryFilters(builder);
    }

    private void ApplyTenantQueryFilters(ModelBuilder builder)
    {
        var method = typeof(AppDbContext).GetMethod(nameof(SetTenantFilter), BindingFlags.NonPublic | BindingFlags.Instance)!;
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(ITenantOwned).IsAssignableFrom(entityType.ClrType))
            {
                method.MakeGenericMethod(entityType.ClrType).Invoke(this, new object[] { builder });
            }
        }

        // AppUser has a nullable TenantId (null = platform/Super Admin account) so it can't implement ITenantOwned.
        builder.Entity<AppUser>().HasQueryFilter(u =>
            _tenantContext.BypassTenantFilter || u.TenantId == _tenantContext.TenantId);
        builder.Entity<AppRole>().HasQueryFilter(r =>
            _tenantContext.BypassTenantFilter || r.TenantId == null || r.TenantId == _tenantContext.TenantId);
    }

    private void SetTenantFilter<TEntity>(ModelBuilder builder) where TEntity : class, ITenantOwned
    {
        builder.Entity<TEntity>().HasQueryFilter(e =>
            _tenantContext.BypassTenantFilter || e.TenantId == (_tenantContext.TenantId ?? Guid.Empty));
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var userId = _tenantContext.UserId;
        var auditEntries = new List<AuditLog>();

        foreach (var entry in ChangeTracker.Entries().ToList())
        {
            if (entry.Entity is AuditLog) continue;

            if (entry.Entity is ITenantOwned tenantOwned && entry.State == EntityState.Added && tenantOwned.TenantId == Guid.Empty)
            {
                tenantOwned.TenantId = _tenantContext.TenantId ?? Guid.Empty;
            }

            if (entry.Entity is BaseEntity baseEntity)
            {
                if (entry.State == EntityState.Added)
                {
                    baseEntity.CreatedAt = now;
                    baseEntity.CreatedBy = userId;
                }
                else if (entry.State == EntityState.Modified)
                {
                    baseEntity.UpdatedAt = now;
                    baseEntity.UpdatedBy = userId;
                }
            }

            if (entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted &&
                entry.Entity is not RefreshToken &&
                entry.Entity is not Domain.Portal.PortalRefreshToken &&
                entry.Entity is not Domain.Portal.PortalPasswordResetToken &&
                entry.Entity.GetType().Namespace?.StartsWith("Microsoft.AspNetCore.Identity") != true)
            {
                var entityType = entry.Entity.GetType().Name;
                var idProp = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "Id");
                var entityId = idProp?.CurrentValue?.ToString();

                auditEntries.Add(new AuditLog
                {
                    TenantId = _tenantContext.TenantId,
                    UserId = userId,
                    UserEmail = _tenantContext.UserEmail,
                    Action = entry.State.ToString(),
                    Module = "System",
                    EntityType = entityType,
                    EntityId = entityId,
                    BeforeJson = entry.State != EntityState.Added ? SerializeSafely(entry.OriginalValues) : null,
                    AfterJson = entry.State != EntityState.Deleted ? SerializeSafely(entry.CurrentValues) : null,
                    CreatedAt = now
                });
            }
        }

        var result = await base.SaveChangesAsync(cancellationToken);

        if (auditEntries.Count > 0)
        {
            AuditLogs.AddRange(auditEntries);
            await base.SaveChangesAsync(cancellationToken);
        }

        return result;
    }

    private static string? SerializeSafely(Microsoft.EntityFrameworkCore.ChangeTracking.PropertyValues values)
    {
        try
        {
            var dict = values.Properties.ToDictionary(p => p.Name, p => values[p]);
            return JsonSerializer.Serialize(dict);
        }
        catch
        {
            return null;
        }
    }
}

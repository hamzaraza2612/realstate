namespace RealEstateErp.Shared.Security;

/// <summary>
/// Canonical catalog of permission codes. Roles are database-driven and are assigned
/// a subset of these; controllers/handlers gate on the permission code, never on role name.
/// New modules append their own nested static class + call <see cref="All"/> is refreshed via reflection.
/// </summary>
public static class Permissions
{
    public static class Users
    {
        public const string View = "users.view";
        public const string Manage = "users.manage";
    }

    public static class Roles
    {
        public const string View = "roles.view";
        public const string Manage = "roles.manage";
    }

    public static class Organizations
    {
        public const string View = "organizations.view";
        public const string Manage = "organizations.manage";
    }

    public static class AuditLogs
    {
        public const string View = "audit_logs.view";
    }

    public static class Platform
    {
        public const string ManageTenants = "platform.tenants.manage";
        public const string ManagePlans = "platform.plans.manage";
        public const string ViewAuditLogs = "platform.audit_logs.view";
    }

    public static class Crm
    {
        public const string LeadView = "crm.lead.view";
        public const string LeadCreate = "crm.lead.create";
        public const string LeadUpdate = "crm.lead.update";
        public const string LeadAssign = "crm.lead.assign";
        public const string LeadDelete = "crm.lead.delete";
        public const string CustomerView = "crm.customer.view";
        public const string CustomerManage = "crm.customer.manage";
    }

    public static class Sales
    {
        public const string BookingView = "sales.booking.view";
        public const string BookingCreate = "sales.booking.create";
        public const string BookingApprove = "sales.booking.approve";
        public const string BookingCancel = "sales.booking.cancel";
        public const string PaymentRecord = "sales.payment.record";
    }

    public static class Finance
    {
        public const string InvoiceCreate = "finance.invoice.create";
        public const string PaymentApprove = "finance.payment.approve";
        public const string ReportsView = "finance.reports.view";
    }

    public static class Projects
    {
        public const string View = "projects.view";
        public const string Manage = "projects.manage";
    }

    public static class Inventory
    {
        public const string View = "inventory.view";
        public const string Manage = "inventory.manage";
    }

    public static class Construction
    {
        public const string ProjectManage = "construction.project.manage";
    }

    public static class Property
    {
        public const string LeaseManage = "property.lease.manage";
    }

    public static class Procurement
    {
        public const string RequestCreate = "procurement.request.create";
        public const string OrderApprove = "procurement.order.approve";
    }

    public static class Facility
    {
        public const string WorkOrderManage = "facility.work_order.manage";
    }

    public static class Hr
    {
        public const string EmployeeManage = "hr.employee.manage";
    }

    public static class Reports
    {
        public const string View = "reports.view";
    }

    /// <summary>All permission codes declared above, discovered via reflection for seeding.</summary>
    public static IReadOnlyList<string> All { get; } = DiscoverAll();

    private static IReadOnlyList<string> DiscoverAll()
    {
        var codes = new List<string>();
        foreach (var nested in typeof(Permissions).GetNestedTypes())
        {
            foreach (var field in nested.GetFields())
            {
                if (field.IsLiteral && field.FieldType == typeof(string))
                {
                    codes.Add((string)field.GetRawConstantValue()!);
                }
            }
        }
        return codes;
    }
}

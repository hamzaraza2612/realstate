namespace RealEstateErp.Application.Crm.Dashboard;

public record CrmDashboardDto(
    int TotalLeads,
    int NewLeadsLast30Days,
    int UnassignedLeads,
    int AssignedLeads,
    IReadOnlyDictionary<string, int> LeadsByStatus,
    int TotalCustomers,
    int PendingFollowUps,
    int OverdueFollowUps,
    double ConversionRatePercent);

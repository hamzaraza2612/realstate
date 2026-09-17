using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Crm.Dashboard;
using RealEstateErp.Domain.Crm;
using RealEstateErp.Infrastructure.Persistence;

namespace RealEstateErp.Infrastructure.Services.Crm;

public class CrmDashboardService : ICrmDashboardService
{
    private readonly AppDbContext _db;

    public CrmDashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<CrmDashboardDto> GetAsync(CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);

        var totalLeads = await _db.Leads.CountAsync(ct);
        var newLeadsLast30Days = await _db.Leads.CountAsync(l => l.CreatedAt >= thirtyDaysAgo, ct);
        var unassignedLeads = await _db.Leads.CountAsync(l => l.AssignedToUserId == null, ct);
        var wonLeads = await _db.Leads.CountAsync(l => l.Status == LeadStatus.Won, ct);

        var leadsByStatus = await _db.Leads
            .GroupBy(l => l.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var totalCustomers = await _db.Customers.CountAsync(ct);

        var pendingFollowUps = await _db.Activities.CountAsync(a => a.Status == ActivityStatus.Pending, ct);
        var overdueFollowUps = await _db.Activities.CountAsync(a =>
            a.Status == ActivityStatus.Pending && a.DueDate != null && a.DueDate < now, ct);

        return new CrmDashboardDto(
            totalLeads,
            newLeadsLast30Days,
            unassignedLeads,
            totalLeads - unassignedLeads,
            leadsByStatus.ToDictionary(x => x.Status.ToString(), x => x.Count),
            totalCustomers,
            pendingFollowUps,
            overdueFollowUps,
            totalLeads == 0 ? 0 : Math.Round(wonLeads * 100.0 / totalLeads, 1));
    }
}

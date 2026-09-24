using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Reporting.Common;
using RealEstateErp.Application.Reporting.Sales;
using RealEstateErp.Domain.Crm;
using RealEstateErp.Domain.Sales;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Reporting;

public class SalesReportService : ISalesReportService
{
    private readonly AppDbContext _db;

    public SalesReportService(AppDbContext db)
    {
        _db = db;
    }

    private IQueryable<Booking> FilteredBookings(SalesReportFilter filter)
    {
        var query = _db.Bookings.AsQueryable();
        if (filter.From.HasValue) query = query.Where(b => b.BookingDate >= filter.From);
        if (filter.To.HasValue) query = query.Where(b => b.BookingDate <= filter.To);
        if (filter.ProjectId.HasValue) query = query.Where(b => b.ProjectId == filter.ProjectId);
        if (filter.AgentUserId.HasValue) query = query.Where(b => b.SalesAgentUserId == filter.AgentUserId);
        if (filter.CustomerId.HasValue) query = query.Where(b => b.CustomerId == filter.CustomerId);
        if (filter.Status.HasValue) query = query.Where(b => b.Status == filter.Status);
        return query;
    }

    /// <summary>Bookings included in value totals are Confirmed only, unless the caller explicitly
    /// filters to a different status — Draft/PendingApproval/Cancelled otherwise inflate an
    /// "achieved sales" figure with unrealized or reversed pipeline.</summary>
    private IQueryable<Booking> FilteredConfirmedBookings(SalesReportFilter filter) =>
        filter.Status.HasValue ? FilteredBookings(filter) : FilteredBookings(filter).Where(b => b.Status == BookingStatus.Confirmed);

    public async Task<IReadOnlyList<SalesByProjectRowDto>> SalesByProjectAsync(SalesReportFilter filter, CancellationToken ct = default)
    {
        var rows = await FilteredConfirmedBookings(filter)
            .GroupBy(b => b.ProjectId)
            .Select(g => new { ProjectId = g.Key, Count = g.Count(), Total = g.Sum(b => b.NetPrice) })
            .ToListAsync(ct);

        var projectNames = await _db.Projects.Where(p => rows.Select(r => r.ProjectId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return rows.Select(r => new SalesByProjectRowDto(r.ProjectId, projectNames.GetValueOrDefault(r.ProjectId, ""), r.Count, r.Total))
            .OrderByDescending(r => r.TotalNetPrice)
            .ToList();
    }

    public async Task<IReadOnlyList<SalesByPeriodRowDto>> SalesByPeriodAsync(SalesReportFilter filter, CancellationToken ct = default)
    {
        var rows = await FilteredConfirmedBookings(filter)
            .GroupBy(b => new { b.BookingDate.Year, b.BookingDate.Month })
            .Select(g => new SalesByPeriodRowDto(g.Key.Year, g.Key.Month, g.Count(), g.Sum(b => b.NetPrice)))
            .ToListAsync(ct);

        return rows.OrderBy(r => r.Year).ThenBy(r => r.Month).ToList();
    }

    public async Task<IReadOnlyList<SalesByAgentRowDto>> SalesByAgentAsync(SalesReportFilter filter, CancellationToken ct = default)
    {
        var rows = await FilteredConfirmedBookings(filter)
            .GroupBy(b => b.SalesAgentUserId)
            .Select(g => new { AgentUserId = g.Key, Count = g.Count(), Total = g.Sum(b => b.NetPrice) })
            .ToListAsync(ct);

        var agentNames = await _db.Users.Where(u => rows.Select(r => r.AgentUserId).Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        return rows.Select(r => new SalesByAgentRowDto(r.AgentUserId, agentNames.GetValueOrDefault(r.AgentUserId, ""), r.Count, r.Total))
            .OrderByDescending(r => r.TotalNetPrice)
            .ToList();
    }

    public async Task<IReadOnlyList<BookingStatusBreakdownRowDto>> BookingStatusBreakdownAsync(SalesReportFilter filter, CancellationToken ct = default)
    {
        var rows = await FilteredBookings(filter)
            .GroupBy(b => b.Status)
            .Select(g => new BookingStatusBreakdownRowDto(g.Key, g.Count(), g.Sum(b => b.NetPrice)))
            .ToListAsync(ct);
        return rows.OrderBy(r => r.Status).ToList();
    }

    public async Task<BookingConversionDto> BookingConversionAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var (resolvedFrom, resolvedTo) = ReportDateRange.Resolve(from, to);
        var fromUtc = resolvedFrom.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var toUtc = resolvedTo.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var leads = await _db.Leads
            .Where(l => l.CreatedAt >= fromUtc && l.CreatedAt <= toUtc)
            .GroupBy(l => l.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var totalLeads = leads.Sum(l => l.Count);
        var wonLeads = leads.Where(l => l.Status == LeadStatus.Won).Sum(l => l.Count);

        return new BookingConversionDto(
            resolvedFrom, resolvedTo,
            leads.ToDictionary(l => l.Status.ToString(), l => l.Count),
            totalLeads, wonLeads,
            totalLeads == 0 ? 0 : Math.Round(wonLeads * 100.0 / totalLeads, 1));
    }

    public async Task<PagedResult<CancellationRowDto>> CancellationsAsync(PagedRequest request, SalesReportFilter filter, CancellationToken ct = default)
    {
        var cancelled = await FilteredBookings(filter with { Status = BookingStatus.Cancelled })
            .OrderByDescending(b => b.BookingDate)
            .ToListAsync(ct);

        var projectNames = await _db.Projects.Where(p => cancelled.Select(b => b.ProjectId).Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var customerNames = await _db.Customers.Where(c => cancelled.Select(b => b.CustomerId).Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.FullName, ct);

        var rows = cancelled.Select(b => new CancellationRowDto(
                b.Id, b.BookingNumber, b.ProjectId, projectNames.GetValueOrDefault(b.ProjectId, ""),
                b.CustomerId, customerNames.GetValueOrDefault(b.CustomerId, ""), b.NetPrice, b.BookingDate))
            .ToList();

        var total = rows.Count;
        var page = rows.Skip(request.Skip).Take(request.PageSize).ToList();
        return new PagedResult<CancellationRowDto>(page, request.Page, request.PageSize, total);
    }

    public async Task<IReadOnlyList<CollectionsRowDto>> CollectionsAsync(SalesReportFilter filter, CancellationToken ct = default)
    {
        var query = _db.Payments.AsQueryable();
        if (filter.From.HasValue) query = query.Where(p => p.PaymentDate >= filter.From);
        if (filter.To.HasValue) query = query.Where(p => p.PaymentDate <= filter.To);
        if (filter.CustomerId.HasValue)
        {
            var bookingIds = await _db.Bookings.Where(b => b.CustomerId == filter.CustomerId).Select(b => b.Id).ToListAsync(ct);
            query = query.Where(p => bookingIds.Contains(p.BookingId));
        }
        if (filter.ProjectId.HasValue)
        {
            var bookingIds = await _db.Bookings.Where(b => b.ProjectId == filter.ProjectId).Select(b => b.Id).ToListAsync(ct);
            query = query.Where(p => bookingIds.Contains(p.BookingId));
        }

        var rows = await query
            .GroupBy(p => p.PaymentDate)
            .Select(g => new CollectionsRowDto(g.Key, g.Sum(p => p.Amount), g.Count()))
            .ToListAsync(ct);

        return rows.OrderBy(r => r.Date).ToList();
    }

    public async Task<IReadOnlyList<ReceivableAgingRowDto>> ReceivableAgingAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var installments = await _db.Installments
            .Where(i => i.Status != InstallmentStatus.Cancelled && i.Amount > i.PaidAmount)
            .ToListAsync(ct);
        if (installments.Count == 0) return [];

        var bookingIds = installments.Select(i => i.BookingId).Distinct().ToList();
        var bookings = await _db.Bookings.Where(b => bookingIds.Contains(b.Id)).ToDictionaryAsync(b => b.Id, ct);
        var customerIds = bookings.Values.Select(b => b.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);
        var planGraceDays = await _db.PaymentPlans.Select(p => new { p.Id, p.GracePeriodDays }).ToDictionaryAsync(p => p.Id, p => p.GracePeriodDays, ct);

        var byCustomer = new Dictionary<Guid, (decimal Current, decimal D30, decimal D60, decimal D90, decimal D90Plus)>();

        foreach (var installment in installments)
        {
            if (!bookings.TryGetValue(installment.BookingId, out var booking)) continue;
            var outstanding = installment.Amount - installment.PaidAmount;
            var graceDays = planGraceDays.GetValueOrDefault(installment.PaymentPlanId);
            var daysPastDue = today.DayNumber - installment.DueDate.AddDays(graceDays).DayNumber;
            var bucket = AgingBucket.For(daysPastDue);

            var current = byCustomer.GetValueOrDefault(booking.CustomerId);
            byCustomer[booking.CustomerId] = bucket switch
            {
                AgingBucket.Current => current with { Current = current.Current + outstanding },
                AgingBucket.Days1To30 => current with { D30 = current.D30 + outstanding },
                AgingBucket.Days31To60 => current with { D60 = current.D60 + outstanding },
                AgingBucket.Days61To90 => current with { D90 = current.D90 + outstanding },
                _ => current with { D90Plus = current.D90Plus + outstanding }
            };
        }

        return byCustomer.Select(kv => new ReceivableAgingRowDto(
                kv.Key, customerNames.GetValueOrDefault(kv.Key, ""),
                kv.Value.Current, kv.Value.D30, kv.Value.D60, kv.Value.D90, kv.Value.D90Plus,
                kv.Value.Current + kv.Value.D30 + kv.Value.D60 + kv.Value.D90 + kv.Value.D90Plus))
            .OrderByDescending(r => r.Total)
            .ToList();
    }
}

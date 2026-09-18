using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Finance.Receivables;
using RealEstateErp.Domain.Sales;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Infrastructure.Services.Sales;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Finance;

public class ReceivableService : IReceivableService
{
    private readonly AppDbContext _db;

    public ReceivableService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<ReceivableDto>> ListAsync(PagedRequest request, ReceivableFilter filter, CancellationToken ct = default)
    {
        var installments = await _db.Installments.Where(i => i.Status != InstallmentStatus.Cancelled).ToListAsync(ct);
        var planGracePeriods = await _db.PaymentPlans.Select(p => new { p.Id, p.GracePeriodDays }).ToDictionaryAsync(p => p.Id, p => p.GracePeriodDays, ct);

        var bookingIds = installments.Select(i => i.BookingId).Distinct().ToList();
        var bookings = await _db.Bookings.Where(b => bookingIds.Contains(b.Id)).ToDictionaryAsync(b => b.Id, ct);
        var customerIds = bookings.Values.Select(b => b.CustomerId).Distinct().ToList();
        var customerNames = await _db.Customers.Where(c => customerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct);

        var receivables = installments
            .Where(i => bookings.ContainsKey(i.BookingId) && i.Amount - i.PaidAmount > 0)
            .Select(i =>
            {
                var booking = bookings[i.BookingId];
                var effectiveStatus = PaymentPlanService.EffectiveStatus(i, planGracePeriods.GetValueOrDefault(i.PaymentPlanId));
                return new ReceivableDto(
                    booking.Id, booking.BookingNumber, booking.CustomerId, customerNames.GetValueOrDefault(booking.CustomerId, ""),
                    i.Id, i.Label, i.Amount, i.PaidAmount, i.Amount - i.PaidAmount, i.DueDate, effectiveStatus);
            })
            .Where(r => filter.CustomerId is null || r.CustomerId == filter.CustomerId)
            .Where(r => filter.Status is null || r.Status == filter.Status)
            .Where(r => filter.OverdueOnly != true || r.Status == InstallmentStatus.Overdue)
            .Where(r => string.IsNullOrWhiteSpace(filter.Search) ||
                        r.CustomerName.Contains(filter.Search, StringComparison.OrdinalIgnoreCase) ||
                        r.BookingNumber.Contains(filter.Search, StringComparison.OrdinalIgnoreCase))
            .OrderBy(r => r.DueDate)
            .ToList();

        var total = receivables.Count;
        var page = receivables.Skip(request.Skip).Take(request.PageSize).ToList();
        return new PagedResult<ReceivableDto>(page, request.Page, request.PageSize, total);
    }
}

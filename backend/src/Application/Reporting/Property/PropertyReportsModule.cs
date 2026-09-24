using RealEstateErp.Domain.Property;

namespace RealEstateErp.Application.Reporting.Property;

/// <summary>Occupied / Total per property, as of now — the per-property breakdown behind
/// IPropertyDashboardService's tenant-wide OccupancyRate.</summary>
public record PropertyOccupancyRowDto(Guid PropertyId, string PropertyName, int TotalUnits, int OccupiedUnits, decimal OccupancyRate);

/// <summary>Sum of RentSchedule.Amount due in [From, To] (DueDate), per property.</summary>
public record RentBilledRowDto(Guid PropertyId, string PropertyName, decimal AmountBilled);

/// <summary>Sum of RentPayment.Amount in [From, To] (PaymentDate), per property.</summary>
public record RentCollectedRowDto(Guid PropertyId, string PropertyName, decimal AmountCollected);

/// <summary>RentSchedule rows not yet fully paid where today &gt; DueDate + Lease.GracePeriodDays,
/// as of now — the same overdue rule RentScheduleService already applies per-row.</summary>
public record OverdueRentRowDto(
    Guid LeaseId, string LeaseNumber, Guid PropertyId, string PropertyName, string TenantName,
    decimal OutstandingAmount, DateOnly DueDate, int DaysPastDue);

/// <summary>Rent collected in [From, To], per property — Property's revenue scope is rent only;
/// Facility/Mall revenue (service charges, parking, coworking) is reported separately under
/// Facility, not folded in here.</summary>
public record PropertyRevenueRowDto(Guid PropertyId, string PropertyName, decimal Revenue);

/// <summary>One RentalTenant's outstanding rent balance, aged the same way AR aging ages Sales
/// installments (days past DueDate + GracePeriodDays, as of now).</summary>
public record TenantAgingRowDto(
    Guid RentalTenantId, string TenantName,
    decimal Current, decimal Days1To30, decimal Days31To60, decimal Days61To90, decimal Days90Plus,
    decimal Total);

public record LeaseStatusRowDto(LeaseStatus Status, int Count);

public interface IPropertyReportService
{
    Task<IReadOnlyList<PropertyOccupancyRowDto>> OccupancyAsync(CancellationToken ct = default);
    Task<IReadOnlyList<RentBilledRowDto>> RentBilledAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<IReadOnlyList<RentCollectedRowDto>> RentCollectedAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<IReadOnlyList<OverdueRentRowDto>> OverdueRentAsync(CancellationToken ct = default);
    Task<IReadOnlyList<PropertyRevenueRowDto>> RevenueAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default);
    Task<IReadOnlyList<TenantAgingRowDto>> TenantAgingAsync(CancellationToken ct = default);
    Task<IReadOnlyList<LeaseStatusRowDto>> LeaseStatusAsync(CancellationToken ct = default);
}

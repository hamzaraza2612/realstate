using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Facility;

public enum UtilityType
{
    Electricity = 0,
    Water = 1,
    Gas = 2,
    Other = 3
}

/// <summary>A simple cumulative-meter reading foundation — deliberately not a smart-meter/telemetry
/// integration. Consumption and Amount are computed and stored at reading time from the previous reading
/// for the same meter, so nothing needs to be recomputed later.</summary>
public class UtilityReading : TenantEntity
{
    public Guid? FacilityId { get; set; }
    public Guid? PropertyId { get; set; }

    public UtilityType Type { get; set; }
    public string MeterReference { get; set; } = default!;
    public decimal ReadingValue { get; set; }
    public DateOnly ReadingDate { get; set; }
    public decimal Consumption { get; set; }
    public decimal? RatePerUnit { get; set; }
    public decimal? Amount { get; set; }
    public decimal PaidAmount { get; set; }
}

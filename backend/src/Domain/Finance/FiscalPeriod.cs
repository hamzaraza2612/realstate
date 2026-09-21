using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Finance;

public enum FiscalPeriodStatus
{
    Open = 0,
    Closed = 1
}

/// <summary>
/// An explicit accounting period a tenant can close to stop backdated postings. Periods are opt-in:
/// a journal entry dated outside every defined period is allowed through unrestricted (so tenants who
/// never define periods see no behavior change), but a date falling inside a Closed period is rejected
/// by every posting path — see FiscalPeriodGuard. Periods for a tenant may never overlap (enforced by a
/// database EXCLUDE constraint, not just application validation).
/// </summary>
public class FiscalPeriod : TenantEntity
{
    public string Name { get; set; } = default!;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public FiscalPeriodStatus Status { get; set; } = FiscalPeriodStatus.Open;
    public DateTimeOffset? ClosedAt { get; set; }
    public Guid? ClosedByUserId { get; set; }
}

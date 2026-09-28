using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Localization;

/// <summary>
/// A point-in-time FX rate between two ISO 4217 currencies. Platform-wide reference data (BaseEntity,
/// not tenant-owned) — an exchange rate is a fact about the world, not something one tenant can have
/// a different value for than another. This milestone provides only the manual/system-provider seam
/// (a platform admin recording a rate) — see IExchangeRateService — with no external FX provider
/// integration. IExchangeRateService.ConvertAsync fails clearly (never guesses) when no applicable
/// rate row exists for the requested currency pair and date.
/// </summary>
public class ExchangeRate : BaseEntity
{
    public string BaseCurrency { get; set; } = default!;
    public string QuoteCurrency { get; set; } = default!;

    /// <summary>1 unit of BaseCurrency = Rate units of QuoteCurrency.</summary>
    public decimal Rate { get; set; }

    public DateTimeOffset EffectiveAt { get; set; }

    /// <summary>"manual" for a platform-admin-entered rate (the only source this milestone writes);
    /// a future live FX provider would populate this with its own name.</summary>
    public string Source { get; set; } = "manual";

    public bool IsActive { get; set; } = true;
}

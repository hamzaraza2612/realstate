namespace RealEstateErp.Infrastructure.Services.Ai;

/// <summary>Bound from the "Ai" configuration section — environment variables in production
/// (Ai__ApiKey, Ai__Model, etc.), appsettings.json locally. Enabled defaults to false, and even when
/// true the real provider is only registered if ApiKey is also non-empty (see DependencyInjection) —
/// so a deployment that never configures AI keeps using UnconfiguredAiProvider automatically, exactly
/// mirroring Milestone 14's SmtpSettings/LoggingEmailSender pattern. Never hardcode a key here or
/// anywhere else — it must come from configuration/environment only.</summary>
public class AiSettings
{
    public const string SectionName = "Ai";

    public bool Enabled { get; set; }
    public string ApiKey { get; set; } = "";

    /// <summary>Configurable so a deployment can pick a cheaper/faster model for a high-volume
    /// business-chat feature without a code change — never hardcoded to one vendor's "best" model.</summary>
    public string Model { get; set; } = "claude-opus-5";

    public int MaxOutputTokens { get; set; } = 2048;
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>Tenant-aware rate limit — see IAiRateLimiter.</summary>
    public int RequestsPerMinutePerTenant { get; set; } = 20;

    /// <summary>Caps how many tool-call round trips one "Ask Your Business" turn may take before
    /// forcing a final answer — prevents a runaway loop from an unusual model response.</summary>
    public int MaxToolIterations { get; set; } = 4;
}

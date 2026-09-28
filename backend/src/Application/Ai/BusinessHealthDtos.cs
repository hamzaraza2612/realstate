namespace RealEstateErp.Application.Ai;

/// <summary>Deliberately three plain, explainable states — never a fabricated numeric "score" out of
/// 100. See docs/AI_ARCHITECTURE.md for why, and IBusinessHealthService for the deterministic rule
/// behind every dimension's status.</summary>
public enum HealthStatus
{
    Healthy = 0,
    Attention = 1,
    Critical = 2
}

/// <summary>Reasons are plain, pre-formatted sentences citing the actual numbers a deterministic rule
/// evaluated (e.g. "17 invoices are overdue totalling AED 184,000") — never free-text AI output; the
/// AI layer may later summarize these, but the ERP itself is what generates and guarantees them.</summary>
public record BusinessHealthDimensionDto(
    string Dimension,
    HealthStatus Status,
    string Summary,
    IReadOnlyList<string> Reasons);

public record BusinessHealthDto(HealthStatus Overall, IReadOnlyList<BusinessHealthDimensionDto> Dimensions, DateTimeOffset GeneratedAt);

public interface IBusinessHealthService
{
    Task<BusinessHealthDto> GetAsync(CancellationToken ct = default);
}

/// <summary>One deterministic, rule-generated item for "What Needs My Attention" — the same
/// dimension-level data Business Health aggregates, itemized to the specific entity/fact behind it.
/// Never an AI-generated alert (see docs/AI_ARCHITECTURE.md): every item here is produced by a plain
/// business rule over existing reporting data, with AI's role limited to (optionally) explaining or
/// summarizing a set of these, never inventing new ones.</summary>
public record AttentionItemDto(
    string Category,
    string Title,
    string Summary,
    HealthStatus Severity,
    string? EntityType,
    Guid? EntityId,
    IReadOnlyList<string> Facts,
    string? SuggestedAction);

public interface IAttentionEngineService
{
    Task<IReadOnlyList<AttentionItemDto>> GetAsync(CancellationToken ct = default);
}

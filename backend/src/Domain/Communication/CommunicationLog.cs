using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Communication;

/// <summary>Channels ICommunicationService can dispatch to. A [Flags] enum so a caller can request
/// several at once (e.g. InApp | Email); CommunicationLog.Channel always stores a single bit, one row
/// per channel actually attempted. Only InApp and Email are actually implemented in this milestone;
/// WhatsApp/Sms/Push exist as named future adapters so callers can already request them without a
/// breaking change later — CommunicationService no-ops (and logs Skipped) for a channel with no
/// registered sender rather than throwing, since a caller requesting "notify everywhere" shouldn't
/// fail just because SMS isn't wired up yet.</summary>
[Flags]
public enum CommunicationChannel
{
    None = 0,
    InApp = 1,
    Email = 2,
    WhatsApp = 4,
    Sms = 8,
    Push = 16
}

public enum CommunicationStatus
{
    Sent = 0,
    Failed = 1,
    Skipped = 2
}

/// <summary>Durable record of every communication attempt, regardless of channel or outcome — the
/// "communication history" the platform needs even though the current Email channel is a
/// development-safe logging provider rather than a real mail transport.</summary>
public class CommunicationLog : TenantEntity
{
    public CommunicationChannel Channel { get; set; }
    public Guid? RecipientUserId { get; set; }
    public string? RecipientAddress { get; set; }
    public string Subject { get; set; } = default!;
    public string Body { get; set; } = default!;
    public CommunicationStatus Status { get; set; }
    public string? ErrorMessage { get; set; }
    public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
}

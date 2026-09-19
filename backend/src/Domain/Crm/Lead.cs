using RealEstateErp.Shared.Common;

namespace RealEstateErp.Domain.Crm;

public enum LeadSource
{
    Website = 0,
    Referral = 1,
    WalkIn = 2,
    SocialMedia = 3,
    ColdCall = 4,
    Advertisement = 5,
    Other = 6
}

public enum LeadStatus
{
    New = 0,
    Contacted = 1,
    Qualified = 2,
    ProposalSent = 3,
    Negotiation = 4,
    Won = 5,
    Lost = 6
}

public enum LeadPriority
{
    Low = 0,
    Medium = 1,
    High = 2
}

/// <summary>A prospective customer moving through the sales pipeline. Converts into a <see cref="Customer"/> once won.</summary>
public class Lead : TenantEntity
{
    public string FullName { get; set; } = default!;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? CompanyName { get; set; }
    public LeadSource Source { get; set; } = LeadSource.Other;
    public LeadStatus Status { get; set; } = LeadStatus.New;
    public LeadPriority Priority { get; set; } = LeadPriority.Medium;
    public string? Notes { get; set; }

    /// <summary>Owning agent/sales user. No navigation property — AppUser lives in Infrastructure (Identity), so joins happen at the service layer.</summary>
    public Guid? AssignedToUserId { get; set; }

    /// <summary>Set once this lead converts to a customer (see Customer.ConvertedFromLeadId for the reverse link).</summary>
    public Guid? ConvertedToCustomerId { get; set; }
}

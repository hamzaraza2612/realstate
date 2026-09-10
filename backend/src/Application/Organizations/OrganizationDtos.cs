using RealEstateErp.Domain.Tenancy;

namespace RealEstateErp.Application.Organizations;

public record OrganizationDto(
    Guid Id, string Name, string Slug, TenantStatus Status, string Timezone,
    string? ContactEmail, string? ContactPhone, Guid? SubscriptionPlanId,
    DateTimeOffset? TrialEndsAt, DateTimeOffset CreatedAt);

public record CreateOrganizationRequest(
    string Name, string Slug, string? ContactEmail, string? ContactPhone, string Timezone,
    Guid? SubscriptionPlanId, string OwnerEmail, string OwnerFullName, string OwnerPassword);

public record UpdateOrganizationRequest(string Name, string? ContactEmail, string? ContactPhone, string Timezone);
public record UpdateOrganizationStatusRequest(TenantStatus Status);

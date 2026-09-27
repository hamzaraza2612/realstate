using RealEstateErp.Domain.Tenancy;

namespace RealEstateErp.Application.Organizations;

public record OrganizationDto(
    Guid Id, string Name, string Slug, TenantStatus Status, string Timezone,
    string? ContactEmail, string? ContactPhone, Guid? SubscriptionPlanId,
    DateTimeOffset? TrialEndsAt, DateTimeOffset CreatedAt,
    string CountryCode, string Currency, string Locale, string DefaultLanguage);

/// <summary>CountryCode is optional; when supplied and Currency/Locale/Timezone aren't explicitly
/// overridden by the caller, they default from Domain.Localization.CountryCatalog — see
/// OrganizationService.CreateAsync. Never assumes a country if omitted (falls back to Tenant's own
/// USD/en-US/UTC defaults), keeping this milestone's "not UAE-only" guarantee: a platform admin who
/// says nothing about country gets the same neutral defaults as before Milestone 15.</summary>
public record CreateOrganizationRequest(
    string Name, string Slug, string? ContactEmail, string? ContactPhone, string Timezone,
    Guid? SubscriptionPlanId, string OwnerEmail, string OwnerFullName, string OwnerPassword,
    string? CountryCode = null, string? Currency = null, string? Locale = null);

public record UpdateOrganizationRequest(string Name, string? ContactEmail, string? ContactPhone, string Timezone);
public record UpdateOrganizationStatusRequest(TenantStatus Status);

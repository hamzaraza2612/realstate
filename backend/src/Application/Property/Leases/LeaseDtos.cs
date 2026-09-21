using RealEstateErp.Domain.Property;

namespace RealEstateErp.Application.Property.Leases;

public record LeaseDto(
    Guid Id,
    string LeaseNumber,
    Guid PropertyId,
    string PropertyName,
    Guid UnitId,
    string UnitNumber,
    Guid RentalTenantId,
    string RentalTenantName,
    DateOnly StartDate,
    DateOnly EndDate,
    decimal RentAmount,
    decimal SecurityDeposit,
    LeasePaymentFrequency PaymentFrequency,
    int GracePeriodDays,
    LeaseStatus Status,
    string? Terms,
    string? Notes,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreateLeaseRequest(
    Guid PropertyId,
    Guid UnitId,
    Guid RentalTenantId,
    DateOnly StartDate,
    DateOnly EndDate,
    decimal RentAmount,
    decimal SecurityDeposit,
    LeasePaymentFrequency PaymentFrequency,
    int GracePeriodDays,
    string? Terms,
    string? Notes);

public record UpdateLeaseRequest(
    DateOnly StartDate,
    DateOnly EndDate,
    decimal RentAmount,
    decimal SecurityDeposit,
    LeasePaymentFrequency PaymentFrequency,
    int GracePeriodDays,
    string? Terms,
    string? Notes);

public record ChangeLeaseStatusRequest(LeaseStatus Status);

public record LeaseFilter(Guid? PropertyId, Guid? UnitId, Guid? RentalTenantId, LeaseStatus? Status, string? Search);

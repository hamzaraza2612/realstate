using FluentValidation;
using RealEstateErp.Domain.Facility.Mall;
using RealEstateErp.Domain.Property;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Facility.Mall;

public record ServiceChargeDefinitionDto(
    Guid Id, Guid FacilityId, string FacilityName, string Name, ServiceChargeCalculationType CalculationType,
    decimal Amount, LeasePaymentFrequency BillingFrequency, bool IsActive, DateTimeOffset CreatedAt);

public record CreateServiceChargeDefinitionRequest(
    Guid FacilityId, string Name, ServiceChargeCalculationType CalculationType, decimal Amount, LeasePaymentFrequency BillingFrequency);

public record UpdateServiceChargeDefinitionRequest(string Name, decimal Amount, LeasePaymentFrequency BillingFrequency, bool IsActive);

public record ServiceChargeChargeDto(
    Guid Id, Guid ServiceChargeDefinitionId, string ServiceChargeDefinitionName, Guid LeaseId, string LeaseNumber,
    DateOnly PeriodStart, DateOnly PeriodEnd, DateOnly DueDate, decimal Amount, decimal PaidAmount, ServiceChargeStatus Status);

public record GenerateServiceChargeRequest(Guid ServiceChargeDefinitionId, Guid LeaseId, DateOnly PeriodStart, DateOnly PeriodEnd, DateOnly DueDate);

public record ServiceChargeDefinitionFilter(Guid? FacilityId, bool? IsActive);
public record ServiceChargeChargeFilter(Guid? LeaseId, Guid? ServiceChargeDefinitionId, ServiceChargeStatus? Status);

public interface IServiceChargeService
{
    Task<PagedResult<ServiceChargeDefinitionDto>> ListDefinitionsAsync(PagedRequest request, ServiceChargeDefinitionFilter filter, CancellationToken ct = default);
    Task<Result<ServiceChargeDefinitionDto>> CreateDefinitionAsync(CreateServiceChargeDefinitionRequest request, CancellationToken ct = default);
    Task<Result<ServiceChargeDefinitionDto>> UpdateDefinitionAsync(Guid id, UpdateServiceChargeDefinitionRequest request, CancellationToken ct = default);
    Task<PagedResult<ServiceChargeChargeDto>> ListChargesAsync(PagedRequest request, ServiceChargeChargeFilter filter, CancellationToken ct = default);
    Task<Result<ServiceChargeChargeDto>> GenerateAsync(GenerateServiceChargeRequest request, CancellationToken ct = default);
}

public class CreateServiceChargeDefinitionRequestValidator : AbstractValidator<CreateServiceChargeDefinitionRequest>
{
    public CreateServiceChargeDefinitionRequestValidator()
    {
        RuleFor(x => x.FacilityId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Amount).GreaterThan(0);
    }
}

public class GenerateServiceChargeRequestValidator : AbstractValidator<GenerateServiceChargeRequest>
{
    public GenerateServiceChargeRequestValidator()
    {
        RuleFor(x => x.PeriodEnd).GreaterThanOrEqualTo(x => x.PeriodStart);
    }
}

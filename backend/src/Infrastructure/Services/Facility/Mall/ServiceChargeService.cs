using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Mall;
using RealEstateErp.Domain.Facility.Mall;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Facility.Mall;

public class ServiceChargeService : IServiceChargeService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public ServiceChargeService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<ServiceChargeDefinitionDto>> ListDefinitionsAsync(PagedRequest request, ServiceChargeDefinitionFilter filter, CancellationToken ct = default)
    {
        var query = _db.ServiceChargeDefinitions.AsQueryable();
        if (filter.FacilityId.HasValue) query = query.Where(d => d.FacilityId == filter.FacilityId);
        if (filter.IsActive.HasValue) query = query.Where(d => d.IsActive == filter.IsActive);

        var total = await query.CountAsync(ct);
        var definitions = await query.OrderByDescending(d => d.CreatedAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        var facilityNames = await _db.Facilities.Where(f => definitions.Select(d => d.FacilityId).Contains(f.Id)).ToDictionaryAsync(f => f.Id, f => f.Name, ct);

        var dtos = definitions.Select(d => new ServiceChargeDefinitionDto(
            d.Id, d.FacilityId, facilityNames.GetValueOrDefault(d.FacilityId, ""), d.Name, d.CalculationType, d.Amount, d.BillingFrequency, d.IsActive, d.CreatedAt)).ToList();
        return new PagedResult<ServiceChargeDefinitionDto>(dtos, request.Page, request.PageSize, total);
    }

    public async Task<Result<ServiceChargeDefinitionDto>> CreateDefinitionAsync(CreateServiceChargeDefinitionRequest request, CancellationToken ct = default)
    {
        var facility = await _db.Facilities.FirstOrDefaultAsync(f => f.Id == request.FacilityId, ct);
        if (facility is null) return Result.Failure<ServiceChargeDefinitionDto>("Facility not found.", "not_found");

        var definition = new ServiceChargeDefinition
        {
            FacilityId = request.FacilityId,
            Name = request.Name,
            CalculationType = request.CalculationType,
            Amount = request.Amount,
            BillingFrequency = request.BillingFrequency
        };
        _db.ServiceChargeDefinitions.Add(definition);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Facility", "ServiceChargeDefinition", definition.Id.ToString(), after: new { definition.Name, definition.Amount }, ct: ct);

        return Result.Success(new ServiceChargeDefinitionDto(
            definition.Id, definition.FacilityId, facility.Name, definition.Name, definition.CalculationType, definition.Amount, definition.BillingFrequency, definition.IsActive, definition.CreatedAt));
    }

    public async Task<Result<ServiceChargeDefinitionDto>> UpdateDefinitionAsync(Guid id, UpdateServiceChargeDefinitionRequest request, CancellationToken ct = default)
    {
        var definition = await _db.ServiceChargeDefinitions.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (definition is null) return Result.Failure<ServiceChargeDefinitionDto>("Service charge definition not found.", "not_found");

        definition.Name = request.Name;
        definition.Amount = request.Amount;
        definition.BillingFrequency = request.BillingFrequency;
        definition.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);

        var facility = await _db.Facilities.FirstAsync(f => f.Id == definition.FacilityId, ct);
        await _auditLogger.LogAsync("Update", "Facility", "ServiceChargeDefinition", definition.Id.ToString(), after: new { definition.Name, definition.IsActive }, ct: ct);

        return Result.Success(new ServiceChargeDefinitionDto(
            definition.Id, definition.FacilityId, facility.Name, definition.Name, definition.CalculationType, definition.Amount, definition.BillingFrequency, definition.IsActive, definition.CreatedAt));
    }

    public async Task<PagedResult<ServiceChargeChargeDto>> ListChargesAsync(PagedRequest request, ServiceChargeChargeFilter filter, CancellationToken ct = default)
    {
        var query = _db.ServiceChargeCharges.AsQueryable();
        if (filter.LeaseId.HasValue) query = query.Where(c => c.LeaseId == filter.LeaseId);
        if (filter.ServiceChargeDefinitionId.HasValue) query = query.Where(c => c.ServiceChargeDefinitionId == filter.ServiceChargeDefinitionId);
        if (filter.Status.HasValue) query = query.Where(c => c.Status == filter.Status);

        var total = await query.CountAsync(ct);
        var charges = await query.OrderByDescending(c => c.DueDate).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<ServiceChargeChargeDto>(await ToChargeDtosAsync(charges, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<ServiceChargeChargeDto>> GenerateAsync(GenerateServiceChargeRequest request, CancellationToken ct = default)
    {
        var definition = await _db.ServiceChargeDefinitions.FirstOrDefaultAsync(d => d.Id == request.ServiceChargeDefinitionId, ct);
        if (definition is null) return Result.Failure<ServiceChargeChargeDto>("Service charge definition not found.", "not_found");
        if (!definition.IsActive) return Result.Failure<ServiceChargeChargeDto>("This service charge definition is inactive.", "definition_inactive");

        var lease = await _db.Leases.FirstOrDefaultAsync(l => l.Id == request.LeaseId, ct);
        if (lease is null) return Result.Failure<ServiceChargeChargeDto>("Lease not found.", "not_found");

        var duplicate = await _db.ServiceChargeCharges.AnyAsync(
            c => c.ServiceChargeDefinitionId == request.ServiceChargeDefinitionId && c.LeaseId == request.LeaseId
                 && c.PeriodStart == request.PeriodStart && c.PeriodEnd == request.PeriodEnd, ct);
        if (duplicate) return Result.Failure<ServiceChargeChargeDto>("A charge for this definition/lease/period has already been generated.", "duplicate_charge");

        // Deterministic: FixedAmount always yields the definition's amount; PerAreaUnit multiplies it by
        // the lease's unit area — the same inputs always produce the same charge amount.
        decimal amount;
        if (definition.CalculationType == ServiceChargeCalculationType.FixedAmount)
        {
            amount = definition.Amount;
        }
        else
        {
            var unit = await _db.PropertyUnits.FirstOrDefaultAsync(u => u.Id == lease.UnitId, ct);
            amount = definition.Amount * (unit?.AreaSize ?? 0);
        }

        var charge = new ServiceChargeCharge
        {
            ServiceChargeDefinitionId = request.ServiceChargeDefinitionId,
            LeaseId = request.LeaseId,
            PeriodStart = request.PeriodStart,
            PeriodEnd = request.PeriodEnd,
            DueDate = request.DueDate,
            Amount = Math.Round(amount, 2)
        };
        _db.ServiceChargeCharges.Add(charge);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Generate", "Facility", "ServiceChargeCharge", charge.Id.ToString(), after: new { charge.LeaseId, charge.Amount }, ct: ct);

        return Result.Success((await ToChargeDtosAsync(new[] { charge }, ct))[0]);
    }

    private async Task<List<ServiceChargeChargeDto>> ToChargeDtosAsync(IReadOnlyCollection<ServiceChargeCharge> charges, CancellationToken ct)
    {
        var definitionIds = charges.Select(c => c.ServiceChargeDefinitionId).Distinct().ToList();
        var definitionNames = await _db.ServiceChargeDefinitions.Where(d => definitionIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.Name, ct);
        var leaseIds = charges.Select(c => c.LeaseId).Distinct().ToList();
        var leaseNumbers = await _db.Leases.Where(l => leaseIds.Contains(l.Id)).ToDictionaryAsync(l => l.Id, l => l.LeaseNumber, ct);

        return charges.Select(c => new ServiceChargeChargeDto(
            c.Id, c.ServiceChargeDefinitionId, definitionNames.GetValueOrDefault(c.ServiceChargeDefinitionId, ""), c.LeaseId, leaseNumbers.GetValueOrDefault(c.LeaseId, ""),
            c.PeriodStart, c.PeriodEnd, c.DueDate, c.Amount, c.PaidAmount, c.Status)).ToList();
    }
}

using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Facility.Utilities;
using RealEstateErp.Domain.Facility;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Facility;

public class UtilityReadingService : IUtilityReadingService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public UtilityReadingService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<UtilityReadingDto>> ListAsync(PagedRequest request, UtilityReadingFilter filter, CancellationToken ct = default)
    {
        var query = _db.UtilityReadings.AsQueryable();
        if (filter.FacilityId.HasValue) query = query.Where(u => u.FacilityId == filter.FacilityId);
        if (filter.PropertyId.HasValue) query = query.Where(u => u.PropertyId == filter.PropertyId);
        if (filter.Type.HasValue) query = query.Where(u => u.Type == filter.Type);
        if (!string.IsNullOrWhiteSpace(filter.MeterReference)) query = query.Where(u => u.MeterReference == filter.MeterReference);

        var total = await query.CountAsync(ct);
        var readings = await query.OrderByDescending(u => u.ReadingDate).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<UtilityReadingDto>(await ToDtosAsync(readings, ct), request.Page, request.PageSize, total);
    }

    public async Task<Result<UtilityReadingDto>> CreateAsync(CreateUtilityReadingRequest request, CancellationToken ct = default)
    {
        if (request.FacilityId.HasValue)
        {
            var facilityExists = await _db.Facilities.AnyAsync(f => f.Id == request.FacilityId, ct);
            if (!facilityExists) return Result.Failure<UtilityReadingDto>("Facility not found.", "not_found");
        }
        if (request.PropertyId.HasValue)
        {
            var propertyExists = await _db.Properties.AnyAsync(p => p.Id == request.PropertyId, ct);
            if (!propertyExists) return Result.Failure<UtilityReadingDto>("Property not found.", "not_found");
        }

        var previous = await _db.UtilityReadings
            .Where(u => u.MeterReference == request.MeterReference && u.Type == request.Type
                        && u.FacilityId == request.FacilityId && u.PropertyId == request.PropertyId)
            .OrderByDescending(u => u.ReadingDate).FirstOrDefaultAsync(ct);

        if (previous is not null && request.ReadingValue < previous.ReadingValue)
        {
            return Result.Failure<UtilityReadingDto>(
                $"Reading of {request.ReadingValue} is lower than the previous reading of {previous.ReadingValue} for this meter — a cumulative meter reading cannot decrease.", "invalid_reading");
        }

        var consumption = previous is null ? 0 : request.ReadingValue - previous.ReadingValue;
        var amount = request.RatePerUnit.HasValue ? consumption * request.RatePerUnit.Value : (decimal?)null;

        var reading = new UtilityReading
        {
            FacilityId = request.FacilityId,
            PropertyId = request.PropertyId,
            Type = request.Type,
            MeterReference = request.MeterReference,
            ReadingValue = request.ReadingValue,
            ReadingDate = request.ReadingDate,
            Consumption = consumption,
            RatePerUnit = request.RatePerUnit,
            Amount = amount
        };
        _db.UtilityReadings.Add(reading);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Facility", "UtilityReading", reading.Id.ToString(),
            after: new { reading.MeterReference, reading.Type, reading.Consumption }, ct: ct);

        return Result.Success((await ToDtosAsync(new[] { reading }, ct))[0]);
    }

    private async Task<List<UtilityReadingDto>> ToDtosAsync(IReadOnlyCollection<UtilityReading> readings, CancellationToken ct)
    {
        var facilityIds = readings.Where(r => r.FacilityId.HasValue).Select(r => r.FacilityId!.Value).Distinct().ToList();
        var facilityNames = await _db.Facilities.Where(f => facilityIds.Contains(f.Id)).ToDictionaryAsync(f => f.Id, f => f.Name, ct);
        var propertyIds = readings.Where(r => r.PropertyId.HasValue).Select(r => r.PropertyId!.Value).Distinct().ToList();
        var propertyNames = await _db.Properties.Where(p => propertyIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        return readings.Select(r => new UtilityReadingDto(
            r.Id, r.FacilityId, r.FacilityId.HasValue ? facilityNames.GetValueOrDefault(r.FacilityId.Value) : null,
            r.PropertyId, r.PropertyId.HasValue ? propertyNames.GetValueOrDefault(r.PropertyId.Value) : null,
            r.Type, r.MeterReference, r.ReadingValue, r.ReadingDate, r.Consumption, r.RatePerUnit, r.Amount, r.PaidAmount, r.CreatedAt)).ToList();
    }
}

using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Localization;
using RealEstateErp.Domain.Localization;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Localization;

/// <summary>Platform-admin CRUD for the global TaxProfile/TaxRate catalog — see docs/TAX_ENGINE.md.
/// Always reachable only via a PlatformControllerBase-derived controller.</summary>
public class TaxProfileService : ITaxProfileService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public TaxProfileService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<IReadOnlyList<TaxProfileDto>> ListAsync(string? countryCode = null, CancellationToken ct = default)
    {
        var query = _db.TaxProfiles.Include(p => p.Rates).AsQueryable();
        if (!string.IsNullOrWhiteSpace(countryCode)) query = query.Where(p => p.CountryCode == countryCode);
        var profiles = await query.OrderBy(p => p.CountryCode).ThenBy(p => p.Code).ToListAsync(ct);
        return profiles.Select(ToDto).ToList();
    }

    public async Task<Result<TaxProfileDto>> GetAsync(Guid id, CancellationToken ct = default)
    {
        var profile = await _db.TaxProfiles.Include(p => p.Rates).FirstOrDefaultAsync(p => p.Id == id, ct);
        return profile is null ? Result.Failure<TaxProfileDto>("Tax profile not found.", "not_found") : Result.Success(ToDto(profile));
    }

    public async Task<Result<TaxProfileDto>> CreateAsync(CreateTaxProfileRequest request, CancellationToken ct = default)
    {
        var codeTaken = await _db.TaxProfiles.AnyAsync(p => p.Code == request.Code, ct);
        if (codeTaken) return Result.Failure<TaxProfileDto>("A tax profile with this code already exists.", "code_taken");

        var profile = new TaxProfile
        {
            CountryCode = request.CountryCode.ToUpperInvariant(),
            Code = request.Code,
            Name = request.Name,
            Description = request.Description
        };
        _db.TaxProfiles.Add(profile);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Create", "Localization", "TaxProfile", profile.Id.ToString(), after: new { profile.Code, profile.CountryCode }, ct: ct);
        return Result.Success(ToDto(profile));
    }

    public async Task<Result<TaxProfileDto>> UpdateAsync(Guid id, UpdateTaxProfileRequest request, CancellationToken ct = default)
    {
        var profile = await _db.TaxProfiles.Include(p => p.Rates).FirstOrDefaultAsync(p => p.Id == id, ct);
        if (profile is null) return Result.Failure<TaxProfileDto>("Tax profile not found.", "not_found");

        var before = new { profile.Name, profile.IsActive };
        profile.Name = request.Name;
        profile.Description = request.Description;
        profile.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("Update", "Localization", "TaxProfile", profile.Id.ToString(), before, new { profile.Name, profile.IsActive }, ct: ct);
        return Result.Success(ToDto(profile));
    }

    public async Task<Result<TaxRateDto>> AddRateAsync(Guid taxProfileId, CreateTaxRateRequest request, CancellationToken ct = default)
    {
        var profile = await _db.TaxProfiles.FirstOrDefaultAsync(p => p.Id == taxProfileId, ct);
        if (profile is null) return Result.Failure<TaxRateDto>("Tax profile not found.", "not_found");

        var codeTaken = await _db.TaxRates.AnyAsync(r => r.TaxProfileId == taxProfileId && r.RateCode == request.RateCode, ct);
        if (codeTaken) return Result.Failure<TaxRateDto>("A rate with this code already exists on this profile.", "rate_code_taken");

        var rate = new TaxRate
        {
            TaxProfileId = taxProfileId,
            RateCode = request.RateCode,
            Name = request.Name,
            Percentage = request.Percentage,
            IsInclusive = request.IsInclusive,
            EffectiveFrom = request.EffectiveFrom,
            EffectiveTo = request.EffectiveTo
        };
        _db.TaxRates.Add(rate);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("AddRate", "Localization", "TaxRate", rate.Id.ToString(),
            after: new { rate.RateCode, rate.Percentage, TaxProfileId = taxProfileId }, ct: ct);
        return Result.Success(ToRateDto(rate));
    }

    public async Task<Result<TaxRateDto>> UpdateRateAsync(Guid taxProfileId, Guid rateId, UpdateTaxRateRequest request, CancellationToken ct = default)
    {
        var rate = await _db.TaxRates.FirstOrDefaultAsync(r => r.Id == rateId && r.TaxProfileId == taxProfileId, ct);
        if (rate is null) return Result.Failure<TaxRateDto>("Tax rate not found.", "not_found");

        // Historical invoices reference this row by Id (Invoice.TaxRateId) but snapshot its values
        // separately (Invoice.TaxPercentage etc.) — changing Percentage here never rewrites them.
        var before = new { rate.Percentage, rate.IsActive };
        rate.Name = request.Name;
        rate.Percentage = request.Percentage;
        rate.IsInclusive = request.IsInclusive;
        rate.EffectiveFrom = request.EffectiveFrom;
        rate.EffectiveTo = request.EffectiveTo;
        rate.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("UpdateRate", "Localization", "TaxRate", rate.Id.ToString(), before, new { rate.Percentage, rate.IsActive }, ct: ct);
        return Result.Success(ToRateDto(rate));
    }

    private static TaxProfileDto ToDto(TaxProfile p) => new(
        p.Id, p.CountryCode, p.Code, p.Name, p.Description, p.IsActive,
        p.Rates.OrderBy(r => r.EffectiveFrom).Select(ToRateDto).ToList());

    private static TaxRateDto ToRateDto(TaxRate r) => new(
        r.Id, r.TaxProfileId, r.RateCode, r.Name, r.Percentage, r.IsInclusive, r.EffectiveFrom, r.EffectiveTo, r.IsActive);
}

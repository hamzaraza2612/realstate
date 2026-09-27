using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Localization;
using RealEstateErp.Domain.Localization;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Localization;

public class TenantTaxProfileService : ITenantTaxProfileService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;

    public TenantTaxProfileService(AppDbContext db, ITenantContext tenantContext, IAuditLogger auditLogger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
    }

    public async Task<Result<TenantTaxProfileDto>> GetCurrentAsync(CancellationToken ct = default)
    {
        if (_tenantContext.TenantId is not { } tenantId) return Result.Failure<TenantTaxProfileDto>("No organization context.", "no_tenant");

        var profile = await _db.TenantTaxProfiles.Include(p => p.TaxProfile).FirstOrDefaultAsync(p => p.TenantId == tenantId, ct);
        return Result.Success(ToDto(profile));
    }

    public async Task<Result<TenantTaxProfileDto>> UpdateCurrentAsync(UpdateTenantTaxProfileRequest request, CancellationToken ct = default)
    {
        if (_tenantContext.TenantId is not { } tenantId) return Result.Failure<TenantTaxProfileDto>("No organization context.", "no_tenant");

        if (request.TaxProfileId is { } taxProfileId)
        {
            var exists = await _db.TaxProfiles.AnyAsync(p => p.Id == taxProfileId && p.IsActive, ct);
            if (!exists) return Result.Failure<TenantTaxProfileDto>("Tax profile not found.", "not_found");
        }

        var profile = await _db.TenantTaxProfiles.FirstOrDefaultAsync(p => p.TenantId == tenantId, ct);
        if (profile is null)
        {
            profile = new TenantTaxProfile { TenantId = tenantId };
            _db.TenantTaxProfiles.Add(profile);
        }

        profile.TaxProfileId = request.TaxProfileId;
        profile.TaxRegistrationNumber = request.TaxRegistrationNumber;
        profile.LegalEntityName = request.LegalEntityName;
        profile.LegalAddressLine1 = request.LegalAddressLine1;
        profile.LegalAddressLine2 = request.LegalAddressLine2;
        profile.LegalCity = request.LegalCity;
        profile.LegalStateOrProvince = request.LegalStateOrProvince;
        profile.LegalPostalCode = request.LegalPostalCode;
        profile.LegalCountryCode = request.LegalCountryCode;

        await _db.SaveChangesAsync(ct);
        await _db.Entry(profile).Reference(p => p.TaxProfile).LoadAsync(ct);

        await _auditLogger.LogAsync("UpdateTaxProfile", "Localization", "TenantTaxProfile", profile.Id.ToString(),
            after: new { profile.TaxProfileId, profile.TaxRegistrationNumber }, tenantIdOverride: tenantId, ct: ct);

        return Result.Success(ToDto(profile));
    }

    private static TenantTaxProfileDto ToDto(TenantTaxProfile? p) => p is null
        ? new TenantTaxProfileDto(null, null, null, null, null, null, null, null, null, null, null)
        : new TenantTaxProfileDto(
            p.TaxProfileId, p.TaxProfile?.Code, p.TaxProfile?.Name, p.TaxRegistrationNumber, p.LegalEntityName,
            p.LegalAddressLine1, p.LegalAddressLine2, p.LegalCity, p.LegalStateOrProvince, p.LegalPostalCode, p.LegalCountryCode);
}

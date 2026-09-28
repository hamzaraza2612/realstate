using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Localization;
using RealEstateErp.Domain.Localization;
using RealEstateErp.Domain.Tenancy;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.Infrastructure.Services.Localization;

public class LocalizationService : ILocalizationService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;

    public LocalizationService(AppDbContext db, ITenantContext tenantContext, IAuditLogger auditLogger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
    }

    public IReadOnlyList<CountryDto> ListCountries() =>
        CountryCatalog.All.Values
            .Select(c => new CountryDto(c.Alpha2, c.Alpha3, c.Name, c.DefaultCurrency, c.DefaultLocale, c.DefaultTimezone, c.PhoneCountryCode, c.DefaultTaxProfileCode))
            .OrderBy(c => c.Name)
            .ToList();

    public IReadOnlyList<CurrencyDto> ListCurrencies() =>
        CurrencyCatalog.All.Values
            .Select(c => new CurrencyDto(c.Code, c.Name, c.Symbol, c.DecimalPlaces))
            .OrderBy(c => c.Code)
            .ToList();

    public async Task<Result<TenantLocalizationDto>> GetCurrentAsync(CancellationToken ct = default)
    {
        if (_tenantContext.TenantId is not { } tenantId)
        {
            return Result.Failure<TenantLocalizationDto>("No organization context.", "no_tenant");
        }

        var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
        return tenant is null
            ? Result.Failure<TenantLocalizationDto>("Organization not found.", "not_found")
            : Result.Success(ToDto(tenant));
    }

    public async Task<Result<TenantLocalizationDto>> UpdateCurrentAsync(UpdateTenantLocalizationRequest request, CancellationToken ct = default)
    {
        if (_tenantContext.TenantId is not { } tenantId)
        {
            return Result.Failure<TenantLocalizationDto>("No organization context.", "no_tenant");
        }

        return await UpdateForTenantAsync(tenantId, request, ct);
    }

    public async Task<Result<TenantLocalizationDto>> UpdateForTenantAsync(Guid tenantId, UpdateTenantLocalizationRequest request, CancellationToken ct = default)
    {
        var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
        if (tenant is null) return Result.Failure<TenantLocalizationDto>("Organization not found.", "not_found");

        var before = ToDto(tenant);

        tenant.CountryCode = request.CountryCode;
        tenant.Currency = request.Currency;
        tenant.Locale = request.Locale;
        tenant.Timezone = request.Timezone;
        tenant.DateFormat = request.DateFormat;
        tenant.FirstDayOfWeek = request.FirstDayOfWeek;
        tenant.DefaultLanguage = request.DefaultLanguage;
        tenant.SecondaryLanguages = request.SecondaryLanguages is { Count: > 0 } langs ? string.Join(",", langs) : null;
        tenant.MeasurementSystem = request.MeasurementSystem;

        await _db.SaveChangesAsync(ct);

        var after = ToDto(tenant);
        await _auditLogger.LogAsync("UpdateLocalization", "Localization", "Tenant", tenant.Id.ToString(),
            before, after, tenantIdOverride: tenant.Id, ct: ct);

        return Result.Success(after);
    }

    private static TenantLocalizationDto ToDto(Tenant t) => new(
        t.CountryCode, t.Currency, t.Locale, t.Timezone, t.DateFormat, t.FirstDayOfWeek, t.DefaultLanguage,
        string.IsNullOrWhiteSpace(t.SecondaryLanguages) ? Array.Empty<string>() : t.SecondaryLanguages.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
        t.MeasurementSystem);
}

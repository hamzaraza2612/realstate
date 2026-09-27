using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Common.Interfaces;
using RealEstateErp.Application.Localization;
using RealEstateErp.Domain.Localization;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Localization;

/// <summary>The manual/system-provider FX seam — see IExchangeRateService. No external FX API is
/// called; SetRateAsync is how a platform admin records a rate by hand. See docs/LOCALIZATION.md.</summary>
public class ExchangeRateService : IExchangeRateService
{
    private readonly AppDbContext _db;
    private readonly IAuditLogger _auditLogger;

    public ExchangeRateService(AppDbContext db, IAuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    public async Task<PagedResult<ExchangeRateDto>> ListAsync(PagedRequest request, string? baseCurrency = null, string? quoteCurrency = null, CancellationToken ct = default)
    {
        var query = _db.ExchangeRates.AsQueryable();
        if (!string.IsNullOrWhiteSpace(baseCurrency)) query = query.Where(r => r.BaseCurrency == baseCurrency);
        if (!string.IsNullOrWhiteSpace(quoteCurrency)) query = query.Where(r => r.QuoteCurrency == quoteCurrency);

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(r => r.EffectiveAt).Skip(request.Skip).Take(request.PageSize).ToListAsync(ct);
        return new PagedResult<ExchangeRateDto>(items.Select(ToDto).ToList(), request.Page, request.PageSize, total);
    }

    public async Task<Result<ExchangeRateDto>> GetLatestRateAsync(string baseCurrency, string quoteCurrency, DateTimeOffset? asOf = null, CancellationToken ct = default)
    {
        var direct = await FindLatestAsync(baseCurrency, quoteCurrency, asOf, ct);
        if (direct is not null) return Result.Success(ToDto(direct));

        var inverse = await FindLatestAsync(quoteCurrency, baseCurrency, asOf, ct);
        if (inverse is not null)
        {
            return Result.Success(new ExchangeRateDto(inverse.Id, baseCurrency, quoteCurrency, 1 / inverse.Rate, inverse.EffectiveAt, inverse.Source, inverse.IsActive));
        }

        return Result.Failure<ExchangeRateDto>($"No exchange rate configured for {baseCurrency}/{quoteCurrency}.", "exchange_rate_not_found");
    }

    public async Task<Result<decimal>> ConvertAsync(decimal amount, string fromCurrency, string toCurrency, DateTimeOffset? asOf = null, CancellationToken ct = default)
    {
        // Same-currency conversion is the identity — never looked up, never "invented".
        if (string.Equals(fromCurrency, toCurrency, StringComparison.OrdinalIgnoreCase)) return Result.Success(amount);

        var rateResult = await GetLatestRateAsync(fromCurrency, toCurrency, asOf, ct);
        if (!rateResult.Succeeded) return Result.Failure<decimal>(rateResult.Error!, rateResult.ErrorCode!);

        return Result.Success(CurrencyCatalog.Round(amount * rateResult.Value!.Rate, toCurrency));
    }

    public async Task<Result<ExchangeRateDto>> SetRateAsync(SetExchangeRateRequest request, CancellationToken ct = default)
    {
        var rate = new ExchangeRate
        {
            BaseCurrency = request.BaseCurrency.ToUpperInvariant(),
            QuoteCurrency = request.QuoteCurrency.ToUpperInvariant(),
            Rate = request.Rate,
            EffectiveAt = request.EffectiveAt ?? DateTimeOffset.UtcNow,
            Source = "manual"
        };
        _db.ExchangeRates.Add(rate);
        await _db.SaveChangesAsync(ct);

        await _auditLogger.LogAsync("SetRate", "Localization", "ExchangeRate", rate.Id.ToString(),
            after: new { rate.BaseCurrency, rate.QuoteCurrency, rate.Rate }, ct: ct);

        return Result.Success(ToDto(rate));
    }

    private async Task<ExchangeRate?> FindLatestAsync(string baseCurrency, string quoteCurrency, DateTimeOffset? asOf, CancellationToken ct)
    {
        var query = _db.ExchangeRates.Where(r => r.BaseCurrency == baseCurrency && r.QuoteCurrency == quoteCurrency && r.IsActive);
        if (asOf.HasValue) query = query.Where(r => r.EffectiveAt <= asOf.Value);
        return await query.OrderByDescending(r => r.EffectiveAt).FirstOrDefaultAsync(ct);
    }

    private static ExchangeRateDto ToDto(ExchangeRate r) => new(r.Id, r.BaseCurrency, r.QuoteCurrency, r.Rate, r.EffectiveAt, r.Source, r.IsActive);
}

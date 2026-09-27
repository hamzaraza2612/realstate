using FluentValidation;
using RealEstateErp.Shared.Common;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.Localization;

public record ExchangeRateDto(Guid Id, string BaseCurrency, string QuoteCurrency, decimal Rate, DateTimeOffset EffectiveAt, string Source, bool IsActive);

public record SetExchangeRateRequest(string BaseCurrency, string QuoteCurrency, decimal Rate, DateTimeOffset? EffectiveAt);

/// <summary>
/// The FX abstraction: a manual/system-provider seam only (no external FX API integration this
/// milestone — see docs/LOCALIZATION.md). ConvertAsync never invents a rate: same-currency conversion
/// is always the identity (no lookup needed), a direct rate row is used when present, its inverse is
/// used when only the reverse pair was recorded (1/rate — still exact, not an invented value), and
/// anything else fails clearly with "exchange_rate_not_found" rather than guessing.
/// </summary>
public interface IExchangeRateService
{
    Task<PagedResult<ExchangeRateDto>> ListAsync(PagedRequest request, string? baseCurrency = null, string? quoteCurrency = null, CancellationToken ct = default);
    Task<Result<ExchangeRateDto>> GetLatestRateAsync(string baseCurrency, string quoteCurrency, DateTimeOffset? asOf = null, CancellationToken ct = default);
    Task<Result<decimal>> ConvertAsync(decimal amount, string fromCurrency, string toCurrency, DateTimeOffset? asOf = null, CancellationToken ct = default);
    Task<Result<ExchangeRateDto>> SetRateAsync(SetExchangeRateRequest request, CancellationToken ct = default);
}

public class SetExchangeRateRequestValidator : AbstractValidator<SetExchangeRateRequest>
{
    public SetExchangeRateRequestValidator()
    {
        RuleFor(x => x.BaseCurrency).NotEmpty().Length(3);
        RuleFor(x => x.QuoteCurrency).NotEmpty().Length(3);
        RuleFor(x => x.Rate).GreaterThan(0);
    }
}

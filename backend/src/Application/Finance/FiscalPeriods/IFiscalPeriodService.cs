using RealEstateErp.Shared.Common;

namespace RealEstateErp.Application.Finance.FiscalPeriods;

public interface IFiscalPeriodService
{
    Task<IReadOnlyList<FiscalPeriodDto>> ListAsync(CancellationToken ct = default);
    Task<Result<FiscalPeriodDto>> CreateAsync(CreateFiscalPeriodRequest request, CancellationToken ct = default);
    Task<Result<FiscalPeriodDto>> CloseAsync(Guid id, CancellationToken ct = default);
    Task<Result<FiscalPeriodDto>> ReopenAsync(Guid id, CancellationToken ct = default);
}

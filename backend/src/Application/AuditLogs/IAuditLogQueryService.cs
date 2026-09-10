using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Application.AuditLogs;

public interface IAuditLogQueryService
{
    Task<PagedResult<AuditLogDto>> ListAsync(PagedRequest request, AuditLogFilter filter, CancellationToken ct = default);
}

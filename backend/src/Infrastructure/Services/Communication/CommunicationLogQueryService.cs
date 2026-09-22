using Microsoft.EntityFrameworkCore;
using RealEstateErp.Application.Communication;
using RealEstateErp.Infrastructure.Persistence;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Infrastructure.Services.Communication;

public class CommunicationLogQueryService : ICommunicationLogQueryService
{
    private readonly AppDbContext _db;

    public CommunicationLogQueryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<CommunicationLogDto>> ListAsync(PagedRequest request, CommunicationLogFilter filter, CancellationToken ct = default)
    {
        var query = _db.CommunicationLogs.AsQueryable();
        if (filter.RecipientUserId.HasValue) query = query.Where(l => l.RecipientUserId == filter.RecipientUserId);
        if (!string.IsNullOrWhiteSpace(filter.EntityType)) query = query.Where(l => l.EntityType == filter.EntityType);
        if (filter.EntityId.HasValue) query = query.Where(l => l.EntityId == filter.EntityId);
        if (filter.Status.HasValue) query = query.Where(l => l.Status == filter.Status);

        var total = await query.CountAsync(ct);
        var logs = await query.OrderByDescending(l => l.CreatedAt).Skip(request.Skip).Take(request.PageSize)
            .Select(l => new CommunicationLogDto(l.Id, l.Channel, l.RecipientUserId, l.RecipientAddress, l.Subject,
                l.Status, l.ErrorMessage, l.EntityType, l.EntityId, l.CreatedAt))
            .ToListAsync(ct);

        return new PagedResult<CommunicationLogDto>(logs, request.Page, request.PageSize, total);
    }
}

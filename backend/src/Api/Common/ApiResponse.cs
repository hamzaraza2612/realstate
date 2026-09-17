using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.Api.Common;

public record ApiMeta(int Page, int PageSize, int Total);

public static class ApiResponse
{
    public static object Ok<T>(T data) => new { data, error = (object?)null, meta = (object?)null };

    public static object Paged<T>(PagedResult<T> result) => new
    {
        data = result.Data,
        error = (object?)null,
        meta = new ApiMeta(result.Page, result.PageSize, result.Total)
    };
}

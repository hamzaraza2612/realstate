namespace RealEstateErp.Shared.Pagination;

public class PagedRequest
{
    private const int MaxPageSize = 100;
    private int _pageSize = 20;

    public int Page { get; set; } = 1;

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value <= 0 ? 20 : Math.Min(value, MaxPageSize);
    }

    public string? SortBy { get; set; }
    public string? SortDir { get; set; } = "asc";
    public int Skip => (Math.Max(Page, 1) - 1) * PageSize;
}

public class PagedResult<T>
{
    public IReadOnlyList<T> Data { get; }
    public int Page { get; }
    public int PageSize { get; }
    public int Total { get; }

    public PagedResult(IReadOnlyList<T> data, int page, int pageSize, int total)
    {
        Data = data;
        Page = page;
        PageSize = pageSize;
        Total = total;
    }
}

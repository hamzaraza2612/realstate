using FluentAssertions;
using RealEstateErp.Shared.Pagination;

namespace RealEstateErp.UnitTests;

public class PagedRequestTests
{
    [Fact]
    public void PageSize_AboveMax_IsClampedTo100()
    {
        var request = new PagedRequest { PageSize = 500 };
        request.PageSize.Should().Be(100);
    }

    [Fact]
    public void PageSize_ZeroOrNegative_FallsBackToDefault20()
    {
        new PagedRequest { PageSize = 0 }.PageSize.Should().Be(20);
        new PagedRequest { PageSize = -5 }.PageSize.Should().Be(20);
    }

    [Theory]
    [InlineData(1, 20, 0)]
    [InlineData(2, 20, 20)]
    [InlineData(3, 10, 20)]
    public void Skip_ComputesCorrectOffset(int page, int pageSize, int expectedSkip)
    {
        var request = new PagedRequest { Page = page, PageSize = pageSize };
        request.Skip.Should().Be(expectedSkip);
    }
}

using FluentAssertions;
using RealEstateErp.Shared.Common;

namespace RealEstateErp.UnitTests;

public class ResultTests
{
    [Fact]
    public void Success_HasNoError()
    {
        var result = Result.Success();
        result.Succeeded.Should().BeTrue();
        result.Error.Should().BeNull();
    }

    [Fact]
    public void Failure_CarriesErrorAndCode()
    {
        var result = Result.Failure("Something went wrong.", "some_code");
        result.Succeeded.Should().BeFalse();
        result.Error.Should().Be("Something went wrong.");
        result.ErrorCode.Should().Be("some_code");
    }

    [Fact]
    public void GenericSuccess_CarriesValue()
    {
        var result = Result.Success(42);
        result.Succeeded.Should().BeTrue();
        result.Value.Should().Be(42);
    }

    [Fact]
    public void GenericFailure_HasDefaultValue()
    {
        var result = Result.Failure<int>("bad");
        result.Succeeded.Should().BeFalse();
        result.Value.Should().Be(0);
    }
}

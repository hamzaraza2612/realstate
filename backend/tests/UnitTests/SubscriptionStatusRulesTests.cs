using FluentAssertions;
using RealEstateErp.Domain.Subscription;

namespace RealEstateErp.UnitTests;

public class SubscriptionStatusRulesTests
{
    [Theory]
    [InlineData(SubscriptionStatus.Trialing, SubscriptionStatus.Active, true)]
    [InlineData(SubscriptionStatus.Trialing, SubscriptionStatus.Expired, true)]
    [InlineData(SubscriptionStatus.Trialing, SubscriptionStatus.Cancelled, true)]
    [InlineData(SubscriptionStatus.Trialing, SubscriptionStatus.PastDue, false)]
    [InlineData(SubscriptionStatus.Active, SubscriptionStatus.PastDue, true)]
    [InlineData(SubscriptionStatus.Active, SubscriptionStatus.Paused, true)]
    [InlineData(SubscriptionStatus.Active, SubscriptionStatus.Cancelled, true)]
    [InlineData(SubscriptionStatus.Active, SubscriptionStatus.Trialing, false)]
    [InlineData(SubscriptionStatus.PastDue, SubscriptionStatus.Active, true)]
    [InlineData(SubscriptionStatus.PastDue, SubscriptionStatus.Cancelled, true)]
    [InlineData(SubscriptionStatus.PastDue, SubscriptionStatus.Expired, true)]
    [InlineData(SubscriptionStatus.Paused, SubscriptionStatus.Active, true)]
    [InlineData(SubscriptionStatus.Paused, SubscriptionStatus.Cancelled, true)]
    [InlineData(SubscriptionStatus.Paused, SubscriptionStatus.PastDue, false)]
    [InlineData(SubscriptionStatus.Cancelled, SubscriptionStatus.Expired, true)]
    [InlineData(SubscriptionStatus.Cancelled, SubscriptionStatus.Active, false)]
    [InlineData(SubscriptionStatus.Expired, SubscriptionStatus.Active, false)]
    [InlineData(SubscriptionStatus.Expired, SubscriptionStatus.Trialing, false)]
    public void CanTransition_MatchesTheDocumentedStateMachine(SubscriptionStatus from, SubscriptionStatus to, bool expected)
    {
        SubscriptionStatusRules.CanTransition(from, to).Should().Be(expected);
    }

    [Fact]
    public void Expired_IsTerminal_NoTransitionsAllowed()
    {
        foreach (SubscriptionStatus to in Enum.GetValues<SubscriptionStatus>())
        {
            SubscriptionStatusRules.CanTransition(SubscriptionStatus.Expired, to).Should().BeFalse();
        }
    }

    [Theory]
    [InlineData(SubscriptionStatus.Trialing, true)]
    [InlineData(SubscriptionStatus.Active, true)]
    [InlineData(SubscriptionStatus.PastDue, true)]
    [InlineData(SubscriptionStatus.Paused, false)]
    [InlineData(SubscriptionStatus.Cancelled, false)]
    [InlineData(SubscriptionStatus.Expired, false)]
    public void IsCurrentlyUsable_MatchesTrialingActivePastDueOnly(SubscriptionStatus status, bool expected)
    {
        status.IsCurrentlyUsable().Should().Be(expected);
    }
}

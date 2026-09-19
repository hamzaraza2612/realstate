namespace RealEstateErp.Domain.Projects;

/// <summary>Valid inventory status transitions. Centralized here so every entry point (API, future booking/construction modules) enforces the same lifecycle.</summary>
public static class InventoryStatusRules
{
    private static readonly Dictionary<InventoryStatus, InventoryStatus[]> Allowed = new()
    {
        [InventoryStatus.Available] = new[] { InventoryStatus.Reserved, InventoryStatus.Booked, InventoryStatus.Blocked, InventoryStatus.UnderConstruction },
        [InventoryStatus.Reserved] = new[] { InventoryStatus.Available, InventoryStatus.Booked, InventoryStatus.Blocked },
        [InventoryStatus.Booked] = new[] { InventoryStatus.Sold, InventoryStatus.Available, InventoryStatus.Blocked },
        [InventoryStatus.Sold] = new[] { InventoryStatus.HandedOver, InventoryStatus.Blocked },
        [InventoryStatus.Blocked] = new[] { InventoryStatus.Available },
        [InventoryStatus.UnderConstruction] = new[] { InventoryStatus.Available, InventoryStatus.HandedOver, InventoryStatus.Blocked },
        [InventoryStatus.HandedOver] = Array.Empty<InventoryStatus>(),
    };

    public static bool CanTransition(InventoryStatus from, InventoryStatus to) =>
        from == to || (Allowed.TryGetValue(from, out var next) && next.Contains(to));
}

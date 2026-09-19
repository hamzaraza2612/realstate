using RealEstateErp.Domain.Sales;

namespace RealEstateErp.Application.Sales.Bookings;

public record BookingDto(
    Guid Id,
    string BookingNumber,
    Guid CustomerId,
    string CustomerName,
    Guid ProjectId,
    string ProjectName,
    Guid InventoryUnitId,
    string InventoryUnitCode,
    Guid SalesAgentUserId,
    string? SalesAgentUserName,
    DateOnly BookingDate,
    BookingStatus Status,
    decimal TotalPrice,
    decimal Discount,
    decimal NetPrice,
    string? Notes,
    bool HasPaymentPlan,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public record CreateBookingRequest(
    Guid CustomerId,
    Guid ProjectId,
    Guid InventoryUnitId,
    Guid SalesAgentUserId,
    DateOnly BookingDate,
    decimal TotalPrice,
    decimal Discount,
    string? Notes);

public record UpdateBookingRequest(
    Guid SalesAgentUserId,
    DateOnly BookingDate,
    decimal TotalPrice,
    decimal Discount,
    string? Notes);

public record BookingFilter(
    Guid? ProjectId,
    Guid? CustomerId,
    Guid? SalesAgentUserId,
    BookingStatus? Status,
    string? Search);

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstateErp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReportingIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_service_charge_charges_TenantId_DueDate",
                table: "service_charge_charges",
                columns: new[] { "TenantId", "DueDate" });

            migrationBuilder.CreateIndex(
                name: "IX_rent_payments_TenantId_PaymentDate",
                table: "rent_payments",
                columns: new[] { "TenantId", "PaymentDate" });

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_TenantId_OrderDate",
                table: "purchase_orders",
                columns: new[] { "TenantId", "OrderDate" });

            migrationBuilder.CreateIndex(
                name: "IX_payments_TenantId_PaymentDate",
                table: "payments",
                columns: new[] { "TenantId", "PaymentDate" });

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_requests_TenantId_FacilityId",
                table: "maintenance_requests",
                columns: new[] { "TenantId", "FacilityId" });

            migrationBuilder.CreateIndex(
                name: "IX_facility_payments_TenantId_PaymentDate",
                table: "facility_payments",
                columns: new[] { "TenantId", "PaymentDate" });

            migrationBuilder.CreateIndex(
                name: "IX_expenses_TenantId_Status_ExpenseDate",
                table: "expenses",
                columns: new[] { "TenantId", "Status", "ExpenseDate" });

            migrationBuilder.CreateIndex(
                name: "IX_bookings_TenantId_Status_BookingDate",
                table: "bookings",
                columns: new[] { "TenantId", "Status", "BookingDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_service_charge_charges_TenantId_DueDate",
                table: "service_charge_charges");

            migrationBuilder.DropIndex(
                name: "IX_rent_payments_TenantId_PaymentDate",
                table: "rent_payments");

            migrationBuilder.DropIndex(
                name: "IX_purchase_orders_TenantId_OrderDate",
                table: "purchase_orders");

            migrationBuilder.DropIndex(
                name: "IX_payments_TenantId_PaymentDate",
                table: "payments");

            migrationBuilder.DropIndex(
                name: "IX_maintenance_requests_TenantId_FacilityId",
                table: "maintenance_requests");

            migrationBuilder.DropIndex(
                name: "IX_facility_payments_TenantId_PaymentDate",
                table: "facility_payments");

            migrationBuilder.DropIndex(
                name: "IX_expenses_TenantId_Status_ExpenseDate",
                table: "expenses");

            migrationBuilder.DropIndex(
                name: "IX_bookings_TenantId_Status_BookingDate",
                table: "bookings");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstateErp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSalesBookingModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "bookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    InventoryUnitId = table.Column<Guid>(type: "uuid", nullable: false),
                    SalesAgentUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Discount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    NetPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_bookings_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_bookings_inventory_units_InventoryUnitId",
                        column: x => x.InventoryUnitId,
                        principalTable: "inventory_units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_bookings_projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "payment_plans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BookingAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    DownPayment = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PlanType = table.Column<int>(type: "integer", nullable: false),
                    Frequency = table.Column<int>(type: "integer", nullable: false),
                    NumberOfInstallments = table.Column<int>(type: "integer", nullable: false),
                    GracePeriodDays = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_plans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payment_plans_bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "installments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentPlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    InstallmentNumber = table.Column<int>(type: "integer", nullable: false),
                    Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PaidAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PaymentDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_installments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_installments_bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_installments_payment_plans_PaymentPlanId",
                        column: x => x.PaymentPlanId,
                        principalTable: "payment_plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReceiptNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    InstallmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PaymentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Method = table.Column<int>(type: "integer", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    RecordedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payments_bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_installments_InstallmentId",
                        column: x => x.InstallmentId,
                        principalTable: "installments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_bookings_CustomerId",
                table: "bookings",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_InventoryUnitId",
                table: "bookings",
                column: "InventoryUnitId",
                unique: true,
                filter: "\"Status\" <> 3");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_ProjectId",
                table: "bookings",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_TenantId_BookingNumber",
                table: "bookings",
                columns: new[] { "TenantId", "BookingNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_bookings_TenantId_CustomerId",
                table: "bookings",
                columns: new[] { "TenantId", "CustomerId" });

            migrationBuilder.CreateIndex(
                name: "IX_bookings_TenantId_ProjectId",
                table: "bookings",
                columns: new[] { "TenantId", "ProjectId" });

            migrationBuilder.CreateIndex(
                name: "IX_bookings_TenantId_SalesAgentUserId",
                table: "bookings",
                columns: new[] { "TenantId", "SalesAgentUserId" });

            migrationBuilder.CreateIndex(
                name: "IX_bookings_TenantId_Status",
                table: "bookings",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_installments_BookingId",
                table: "installments",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_installments_PaymentPlanId_InstallmentNumber",
                table: "installments",
                columns: new[] { "PaymentPlanId", "InstallmentNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_installments_TenantId_BookingId",
                table: "installments",
                columns: new[] { "TenantId", "BookingId" });

            migrationBuilder.CreateIndex(
                name: "IX_installments_TenantId_Status_DueDate",
                table: "installments",
                columns: new[] { "TenantId", "Status", "DueDate" });

            migrationBuilder.CreateIndex(
                name: "IX_payment_plans_BookingId",
                table: "payment_plans",
                column: "BookingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_BookingId",
                table: "payments",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_InstallmentId",
                table: "payments",
                column: "InstallmentId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_TenantId_BookingId",
                table: "payments",
                columns: new[] { "TenantId", "BookingId" });

            migrationBuilder.CreateIndex(
                name: "IX_payments_TenantId_InstallmentId",
                table: "payments",
                columns: new[] { "TenantId", "InstallmentId" });

            migrationBuilder.CreateIndex(
                name: "IX_payments_TenantId_ReceiptNumber",
                table: "payments",
                columns: new[] { "TenantId", "ReceiptNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "payments");

            migrationBuilder.DropTable(
                name: "installments");

            migrationBuilder.DropTable(
                name: "payment_plans");

            migrationBuilder.DropTable(
                name: "bookings");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstateErp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPropertyRentalModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "properties",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    AddressLine = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    State = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PostalCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    OwnerName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    OwnerContact = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_properties", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "rental_tenants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsCompany = table.Column<bool>(type: "boolean", nullable: false),
                    IdentificationNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rental_tenants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_rental_tenants_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "property_units",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PropertyId = table.Column<Guid>(type: "uuid", nullable: false),
                    BuildingBlock = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    UnitNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Floor = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    AreaSize = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    AreaUnit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Bedrooms = table.Column<int>(type: "integer", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    MarketRentRate = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    MetadataJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_property_units", x => x.Id);
                    table.ForeignKey(
                        name: "FK_property_units_properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "leases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LeaseNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PropertyId = table.Column<Guid>(type: "uuid", nullable: false),
                    UnitId = table.Column<Guid>(type: "uuid", nullable: false),
                    RentalTenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    RentAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    SecurityDeposit = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PaymentFrequency = table.Column<int>(type: "integer", nullable: false),
                    GracePeriodDays = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Terms = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_leases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_leases_properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_leases_property_units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "property_units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_leases_rental_tenants_RentalTenantId",
                        column: x => x.RentalTenantId,
                        principalTable: "rental_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "maintenance_requests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PropertyId = table.Column<Guid>(type: "uuid", nullable: false),
                    UnitId = table.Column<Guid>(type: "uuid", nullable: true),
                    RentalTenantId = table.Column<Guid>(type: "uuid", nullable: true),
                    Category = table.Column<int>(type: "integer", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ReportedDate = table.Column<DateOnly>(type: "date", nullable: false),
                    AssignedToUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    AssignedVendorId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ResolutionNotes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CompletionDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_maintenance_requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_maintenance_requests_properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_maintenance_requests_property_units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "property_units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_maintenance_requests_rental_tenants_RentalTenantId",
                        column: x => x.RentalTenantId,
                        principalTable: "rental_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_maintenance_requests_vendors_AssignedVendorId",
                        column: x => x.AssignedVendorId,
                        principalTable: "vendors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "rent_schedules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LeaseId = table.Column<Guid>(type: "uuid", nullable: false),
                    PeriodNumber = table.Column<int>(type: "integer", nullable: false),
                    PeriodStart = table.Column<DateOnly>(type: "date", nullable: false),
                    PeriodEnd = table.Column<DateOnly>(type: "date", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PaidAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rent_schedules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_rent_schedules_leases_LeaseId",
                        column: x => x.LeaseId,
                        principalTable: "leases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "security_deposits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LeaseId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    ReceivedDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RefundedAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    RefundDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_security_deposits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_security_deposits_leases_LeaseId",
                        column: x => x.LeaseId,
                        principalTable: "leases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "rent_payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReceiptNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    LeaseId = table.Column<Guid>(type: "uuid", nullable: false),
                    RentScheduleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PaymentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Method = table.Column<int>(type: "integer", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    RecordedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    IdempotencyKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rent_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_rent_payments_leases_LeaseId",
                        column: x => x.LeaseId,
                        principalTable: "leases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_rent_payments_rent_schedules_RentScheduleId",
                        column: x => x.RentScheduleId,
                        principalTable: "rent_schedules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_leases_PropertyId",
                table: "leases",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_leases_RentalTenantId",
                table: "leases",
                column: "RentalTenantId");

            migrationBuilder.CreateIndex(
                name: "IX_leases_TenantId_LeaseNumber",
                table: "leases",
                columns: new[] { "TenantId", "LeaseNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_leases_TenantId_PropertyId",
                table: "leases",
                columns: new[] { "TenantId", "PropertyId" });

            migrationBuilder.CreateIndex(
                name: "IX_leases_TenantId_Status",
                table: "leases",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_leases_TenantId_UnitId",
                table: "leases",
                columns: new[] { "TenantId", "UnitId" });

            migrationBuilder.CreateIndex(
                name: "IX_leases_UnitId",
                table: "leases",
                column: "UnitId",
                unique: true,
                filter: "\"Status\" < 3");

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_requests_AssignedVendorId",
                table: "maintenance_requests",
                column: "AssignedVendorId");

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_requests_PropertyId",
                table: "maintenance_requests",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_requests_RentalTenantId",
                table: "maintenance_requests",
                column: "RentalTenantId");

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_requests_TenantId_PropertyId",
                table: "maintenance_requests",
                columns: new[] { "TenantId", "PropertyId" });

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_requests_TenantId_RequestNumber",
                table: "maintenance_requests",
                columns: new[] { "TenantId", "RequestNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_requests_TenantId_Status",
                table: "maintenance_requests",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_requests_UnitId",
                table: "maintenance_requests",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_properties_TenantId_Code",
                table: "properties",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_properties_TenantId_Status",
                table: "properties",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_properties_TenantId_Type",
                table: "properties",
                columns: new[] { "TenantId", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_property_units_PropertyId",
                table: "property_units",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_property_units_TenantId_PropertyId_UnitNumber",
                table: "property_units",
                columns: new[] { "TenantId", "PropertyId", "UnitNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_property_units_TenantId_Status",
                table: "property_units",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_rent_payments_LeaseId",
                table: "rent_payments",
                column: "LeaseId");

            migrationBuilder.CreateIndex(
                name: "IX_rent_payments_RentScheduleId",
                table: "rent_payments",
                column: "RentScheduleId");

            migrationBuilder.CreateIndex(
                name: "IX_rent_payments_TenantId_IdempotencyKey",
                table: "rent_payments",
                columns: new[] { "TenantId", "IdempotencyKey" },
                unique: true,
                filter: "\"IdempotencyKey\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_rent_payments_TenantId_LeaseId",
                table: "rent_payments",
                columns: new[] { "TenantId", "LeaseId" });

            migrationBuilder.CreateIndex(
                name: "IX_rent_payments_TenantId_ReceiptNumber",
                table: "rent_payments",
                columns: new[] { "TenantId", "ReceiptNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rent_payments_TenantId_RentScheduleId",
                table: "rent_payments",
                columns: new[] { "TenantId", "RentScheduleId" });

            migrationBuilder.CreateIndex(
                name: "IX_rent_schedules_LeaseId_PeriodNumber",
                table: "rent_schedules",
                columns: new[] { "LeaseId", "PeriodNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rent_schedules_TenantId_Status_DueDate",
                table: "rent_schedules",
                columns: new[] { "TenantId", "Status", "DueDate" });

            migrationBuilder.CreateIndex(
                name: "IX_rental_tenants_CustomerId",
                table: "rental_tenants",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_rental_tenants_TenantId_CustomerId",
                table: "rental_tenants",
                columns: new[] { "TenantId", "CustomerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rental_tenants_TenantId_IsActive",
                table: "rental_tenants",
                columns: new[] { "TenantId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_security_deposits_LeaseId",
                table: "security_deposits",
                column: "LeaseId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "maintenance_requests");

            migrationBuilder.DropTable(
                name: "rent_payments");

            migrationBuilder.DropTable(
                name: "security_deposits");

            migrationBuilder.DropTable(
                name: "rent_schedules");

            migrationBuilder.DropTable(
                name: "leases");

            migrationBuilder.DropTable(
                name: "property_units");

            migrationBuilder.DropTable(
                name: "rental_tenants");

            migrationBuilder.DropTable(
                name: "properties");
        }
    }
}

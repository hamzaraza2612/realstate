using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstateErp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFacilityManagementModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Required for the coworking_bookings EXCLUDE constraint below (a true range-overlap
            // exclusion, not just an equality-based unique index — btree_gist lets a plain Guid column
            // participate in a GiST exclusion constraint alongside the tstzrange).
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS btree_gist;");

            migrationBuilder.AddColumn<Guid>(
                name: "FacilityId",
                table: "maintenance_requests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SlaDueAt",
                table: "maintenance_requests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SlaHours",
                table: "maintenance_requests",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SpaceId",
                table: "maintenance_requests",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "coworking_members",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
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
                    table.PrimaryKey("PK_coworking_members", x => x.Id);
                    table.ForeignKey(
                        name: "FK_coworking_members_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "facilities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PropertyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    AddressLine = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ManagerUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_facilities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_facilities_properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "facility_payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReceiptNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    SourceType = table.Column<int>(type: "integer", nullable: false),
                    SourceId = table.Column<Guid>(type: "uuid", nullable: false),
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
                    table.PrimaryKey("PK_facility_payments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "coworking_bookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    ResourceType = table.Column<int>(type: "integer", nullable: false),
                    ResourceId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PaidAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_coworking_bookings", x => x.Id);
                    table.CheckConstraint("CK_coworking_bookings_valid_range", "\"EndAt\" > \"StartAt\"");
                    table.ForeignKey(
                        name: "FK_coworking_bookings_coworking_members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "coworking_members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // DB-level half of "no overlapping coworking resource bookings": a true range-exclusion
            // constraint (not just a unique index) since bookings overlap on a continuous time axis.
            // Scoped per tenant/resource and excludes Cancelled(=3) bookings, mirroring the
            // application-level pre-check in BookingService.
            migrationBuilder.Sql(
                "ALTER TABLE coworking_bookings ADD CONSTRAINT \"EX_coworking_bookings_no_overlap\" " +
                "EXCLUDE USING gist (\"TenantId\" WITH =, \"ResourceType\" WITH =, \"ResourceId\" WITH =, " +
                "tstzrange(\"StartAt\", \"EndAt\") WITH &&) WHERE (\"Status\" <> 3);");

            migrationBuilder.CreateTable(
                name: "facility_events",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FacilityId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    StartAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Location = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Organizer = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_facility_events", x => x.Id);
                    table.ForeignKey(
                        name: "FK_facility_events_facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "membership_plans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FacilityId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DurationDays = table.Column<int>(type: "integer", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    IncludedHoursCredits = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_membership_plans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_membership_plans_facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "parking_spaces",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FacilityId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_parking_spaces", x => x.Id);
                    table.ForeignKey(
                        name: "FK_parking_spaces_facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "service_charge_definitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FacilityId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CalculationType = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    BillingFrequency = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_service_charge_definitions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_service_charge_definitions_facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "spaces",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FacilityId = table.Column<Guid>(type: "uuid", nullable: false),
                    PropertyUnitId = table.Column<Guid>(type: "uuid", nullable: true),
                    BuildingBlock = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    AreaSize = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    Capacity = table.Column<int>(type: "integer", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Rate = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    MetadataJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_spaces", x => x.Id);
                    table.ForeignKey(
                        name: "FK_spaces_facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_spaces_property_units_PropertyUnitId",
                        column: x => x.PropertyUnitId,
                        principalTable: "property_units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tenant_notices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FacilityId = table.Column<Guid>(type: "uuid", nullable: false),
                    RentalTenantId = table.Column<Guid>(type: "uuid", nullable: true),
                    Subject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Content = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    NoticeDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_notices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tenant_notices_facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tenant_notices_rental_tenants_RentalTenantId",
                        column: x => x.RentalTenantId,
                        principalTable: "rental_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "utility_readings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FacilityId = table.Column<Guid>(type: "uuid", nullable: true),
                    PropertyId = table.Column<Guid>(type: "uuid", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    MeterReference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ReadingValue = table.Column<decimal>(type: "numeric(18,3)", nullable: false),
                    ReadingDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Consumption = table.Column<decimal>(type: "numeric(18,3)", nullable: false),
                    RatePerUnit = table.Column<decimal>(type: "numeric(18,4)", nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    PaidAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_utility_readings", x => x.Id);
                    table.CheckConstraint("CK_utility_readings_facility_or_property", "\"FacilityId\" IS NOT NULL OR \"PropertyId\" IS NOT NULL");
                    table.ForeignKey(
                        name: "FK_utility_readings_facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_utility_readings_properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "memberships",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PaidAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_memberships", x => x.Id);
                    table.ForeignKey(
                        name: "FK_memberships_coworking_members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "coworking_members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_memberships_membership_plans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "membership_plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "parking_allocations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ParkingSpaceId = table.Column<Guid>(type: "uuid", nullable: false),
                    RentalTenantId = table.Column<Guid>(type: "uuid", nullable: true),
                    VehicleReference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PaidAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_parking_allocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_parking_allocations_parking_spaces_ParkingSpaceId",
                        column: x => x.ParkingSpaceId,
                        principalTable: "parking_spaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_parking_allocations_rental_tenants_RentalTenantId",
                        column: x => x.RentalTenantId,
                        principalTable: "rental_tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "service_charge_charges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceChargeDefinitionId = table.Column<Guid>(type: "uuid", nullable: false),
                    LeaseId = table.Column<Guid>(type: "uuid", nullable: false),
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
                    table.PrimaryKey("PK_service_charge_charges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_service_charge_charges_leases_LeaseId",
                        column: x => x.LeaseId,
                        principalTable: "leases",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_service_charge_charges_service_charge_definitions_ServiceCh~",
                        column: x => x.ServiceChargeDefinitionId,
                        principalTable: "service_charge_definitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "desks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SpaceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_desks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_desks_spaces_SpaceId",
                        column: x => x.SpaceId,
                        principalTable: "spaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "facility_service_requests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    FacilityId = table.Column<Guid>(type: "uuid", nullable: false),
                    SpaceId = table.Column<Guid>(type: "uuid", nullable: true),
                    RequestedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RequesterCustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    Category = table.Column<int>(type: "integer", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ReportedDate = table.Column<DateOnly>(type: "date", nullable: false),
                    AssignedToUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    AssignedVendorId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ResolutionNotes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ResolvedDate = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_facility_service_requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_facility_service_requests_customers_RequesterCustomerId",
                        column: x => x.RequesterCustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_facility_service_requests_facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_facility_service_requests_spaces_SpaceId",
                        column: x => x.SpaceId,
                        principalTable: "spaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_facility_service_requests_vendors_AssignedVendorId",
                        column: x => x.AssignedVendorId,
                        principalTable: "vendors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "mall_shop_profiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SpaceId = table.Column<Guid>(type: "uuid", nullable: false),
                    TradeCategory = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    StorefrontName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mall_shop_profiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_mall_shop_profiles_spaces_SpaceId",
                        column: x => x.SpaceId,
                        principalTable: "spaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "meeting_rooms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SpaceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Capacity = table.Column<int>(type: "integer", nullable: false),
                    HourlyRate = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    DailyRate = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_meeting_rooms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_meeting_rooms_spaces_SpaceId",
                        column: x => x.SpaceId,
                        principalTable: "spaces",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_coworking_bookings_MemberId",
                table: "coworking_bookings",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_coworking_bookings_TenantId_MemberId",
                table: "coworking_bookings",
                columns: new[] { "TenantId", "MemberId" });

            migrationBuilder.CreateIndex(
                name: "IX_coworking_bookings_TenantId_ResourceType_ResourceId",
                table: "coworking_bookings",
                columns: new[] { "TenantId", "ResourceType", "ResourceId" });

            migrationBuilder.CreateIndex(
                name: "IX_coworking_members_CustomerId",
                table: "coworking_members",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_coworking_members_TenantId_CustomerId",
                table: "coworking_members",
                columns: new[] { "TenantId", "CustomerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_desks_SpaceId",
                table: "desks",
                column: "SpaceId");

            migrationBuilder.CreateIndex(
                name: "IX_desks_TenantId_SpaceId_Code",
                table: "desks",
                columns: new[] { "TenantId", "SpaceId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_facilities_PropertyId",
                table: "facilities",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_facilities_TenantId_Code",
                table: "facilities",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_facilities_TenantId_PropertyId",
                table: "facilities",
                columns: new[] { "TenantId", "PropertyId" });

            migrationBuilder.CreateIndex(
                name: "IX_facilities_TenantId_Type",
                table: "facilities",
                columns: new[] { "TenantId", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_facility_events_FacilityId",
                table: "facility_events",
                column: "FacilityId");

            migrationBuilder.CreateIndex(
                name: "IX_facility_events_TenantId_FacilityId",
                table: "facility_events",
                columns: new[] { "TenantId", "FacilityId" });

            migrationBuilder.CreateIndex(
                name: "IX_facility_events_TenantId_StartAt",
                table: "facility_events",
                columns: new[] { "TenantId", "StartAt" });

            migrationBuilder.CreateIndex(
                name: "IX_facility_payments_TenantId_IdempotencyKey",
                table: "facility_payments",
                columns: new[] { "TenantId", "IdempotencyKey" },
                unique: true,
                filter: "\"IdempotencyKey\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_facility_payments_TenantId_ReceiptNumber",
                table: "facility_payments",
                columns: new[] { "TenantId", "ReceiptNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_facility_payments_TenantId_SourceType_SourceId",
                table: "facility_payments",
                columns: new[] { "TenantId", "SourceType", "SourceId" });

            migrationBuilder.CreateIndex(
                name: "IX_facility_service_requests_AssignedVendorId",
                table: "facility_service_requests",
                column: "AssignedVendorId");

            migrationBuilder.CreateIndex(
                name: "IX_facility_service_requests_FacilityId",
                table: "facility_service_requests",
                column: "FacilityId");

            migrationBuilder.CreateIndex(
                name: "IX_facility_service_requests_RequesterCustomerId",
                table: "facility_service_requests",
                column: "RequesterCustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_facility_service_requests_SpaceId",
                table: "facility_service_requests",
                column: "SpaceId");

            migrationBuilder.CreateIndex(
                name: "IX_facility_service_requests_TenantId_FacilityId",
                table: "facility_service_requests",
                columns: new[] { "TenantId", "FacilityId" });

            migrationBuilder.CreateIndex(
                name: "IX_facility_service_requests_TenantId_RequestNumber",
                table: "facility_service_requests",
                columns: new[] { "TenantId", "RequestNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_facility_service_requests_TenantId_Status",
                table: "facility_service_requests",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_mall_shop_profiles_SpaceId",
                table: "mall_shop_profiles",
                column: "SpaceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_meeting_rooms_SpaceId",
                table: "meeting_rooms",
                column: "SpaceId");

            migrationBuilder.CreateIndex(
                name: "IX_meeting_rooms_TenantId_SpaceId",
                table: "meeting_rooms",
                columns: new[] { "TenantId", "SpaceId" });

            migrationBuilder.CreateIndex(
                name: "IX_membership_plans_FacilityId",
                table: "membership_plans",
                column: "FacilityId");

            migrationBuilder.CreateIndex(
                name: "IX_membership_plans_TenantId_FacilityId",
                table: "membership_plans",
                columns: new[] { "TenantId", "FacilityId" });

            migrationBuilder.CreateIndex(
                name: "IX_memberships_MemberId",
                table: "memberships",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_memberships_PlanId",
                table: "memberships",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_memberships_TenantId_MemberId",
                table: "memberships",
                columns: new[] { "TenantId", "MemberId" });

            migrationBuilder.CreateIndex(
                name: "IX_memberships_TenantId_Status",
                table: "memberships",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_parking_allocations_ParkingSpaceId",
                table: "parking_allocations",
                column: "ParkingSpaceId",
                unique: true,
                filter: "\"Status\" = 0");

            migrationBuilder.CreateIndex(
                name: "IX_parking_allocations_RentalTenantId",
                table: "parking_allocations",
                column: "RentalTenantId");

            migrationBuilder.CreateIndex(
                name: "IX_parking_allocations_TenantId_ParkingSpaceId",
                table: "parking_allocations",
                columns: new[] { "TenantId", "ParkingSpaceId" });

            migrationBuilder.CreateIndex(
                name: "IX_parking_spaces_FacilityId",
                table: "parking_spaces",
                column: "FacilityId");

            migrationBuilder.CreateIndex(
                name: "IX_parking_spaces_TenantId_FacilityId_Code",
                table: "parking_spaces",
                columns: new[] { "TenantId", "FacilityId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_parking_spaces_TenantId_Status",
                table: "parking_spaces",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_service_charge_charges_LeaseId",
                table: "service_charge_charges",
                column: "LeaseId");

            migrationBuilder.CreateIndex(
                name: "IX_service_charge_charges_ServiceChargeDefinitionId",
                table: "service_charge_charges",
                column: "ServiceChargeDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_service_charge_charges_TenantId_LeaseId",
                table: "service_charge_charges",
                columns: new[] { "TenantId", "LeaseId" });

            migrationBuilder.CreateIndex(
                name: "IX_service_charge_charges_TenantId_Status",
                table: "service_charge_charges",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_service_charge_definitions_FacilityId",
                table: "service_charge_definitions",
                column: "FacilityId");

            migrationBuilder.CreateIndex(
                name: "IX_service_charge_definitions_TenantId_FacilityId",
                table: "service_charge_definitions",
                columns: new[] { "TenantId", "FacilityId" });

            migrationBuilder.CreateIndex(
                name: "IX_spaces_FacilityId",
                table: "spaces",
                column: "FacilityId");

            migrationBuilder.CreateIndex(
                name: "IX_spaces_PropertyUnitId",
                table: "spaces",
                column: "PropertyUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_spaces_TenantId_FacilityId_Code",
                table: "spaces",
                columns: new[] { "TenantId", "FacilityId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_spaces_TenantId_Status",
                table: "spaces",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_tenant_notices_FacilityId",
                table: "tenant_notices",
                column: "FacilityId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_notices_RentalTenantId",
                table: "tenant_notices",
                column: "RentalTenantId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_notices_TenantId_FacilityId",
                table: "tenant_notices",
                columns: new[] { "TenantId", "FacilityId" });

            migrationBuilder.CreateIndex(
                name: "IX_tenant_notices_TenantId_RentalTenantId",
                table: "tenant_notices",
                columns: new[] { "TenantId", "RentalTenantId" });

            migrationBuilder.CreateIndex(
                name: "IX_utility_readings_FacilityId",
                table: "utility_readings",
                column: "FacilityId");

            migrationBuilder.CreateIndex(
                name: "IX_utility_readings_PropertyId",
                table: "utility_readings",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_utility_readings_TenantId_FacilityId_MeterReference",
                table: "utility_readings",
                columns: new[] { "TenantId", "FacilityId", "MeterReference" });

            migrationBuilder.CreateIndex(
                name: "IX_utility_readings_TenantId_PropertyId_MeterReference",
                table: "utility_readings",
                columns: new[] { "TenantId", "PropertyId", "MeterReference" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "coworking_bookings");

            migrationBuilder.DropTable(
                name: "desks");

            migrationBuilder.DropTable(
                name: "facility_events");

            migrationBuilder.DropTable(
                name: "facility_payments");

            migrationBuilder.DropTable(
                name: "facility_service_requests");

            migrationBuilder.DropTable(
                name: "mall_shop_profiles");

            migrationBuilder.DropTable(
                name: "meeting_rooms");

            migrationBuilder.DropTable(
                name: "memberships");

            migrationBuilder.DropTable(
                name: "parking_allocations");

            migrationBuilder.DropTable(
                name: "service_charge_charges");

            migrationBuilder.DropTable(
                name: "tenant_notices");

            migrationBuilder.DropTable(
                name: "utility_readings");

            migrationBuilder.DropTable(
                name: "spaces");

            migrationBuilder.DropTable(
                name: "coworking_members");

            migrationBuilder.DropTable(
                name: "membership_plans");

            migrationBuilder.DropTable(
                name: "parking_spaces");

            migrationBuilder.DropTable(
                name: "service_charge_definitions");

            migrationBuilder.DropTable(
                name: "facilities");

            migrationBuilder.DropColumn(
                name: "FacilityId",
                table: "maintenance_requests");

            migrationBuilder.DropColumn(
                name: "SlaDueAt",
                table: "maintenance_requests");

            migrationBuilder.DropColumn(
                name: "SlaHours",
                table: "maintenance_requests");

            migrationBuilder.DropColumn(
                name: "SpaceId",
                table: "maintenance_requests");
        }
    }
}

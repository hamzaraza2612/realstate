using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstateErp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSaasLocalizationTaxFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Default values below match Tenant's C# property initializers (Domain/Tenancy/Tenant.cs) —
            // EF's scaffolding doesn't infer column defaults from C# field initializers, so these are
            // set explicitly here to avoid every pre-Milestone-15 tenant silently getting empty-string
            // locale settings after this migration runs.
            migrationBuilder.AddColumn<string>(
                name: "CountryCode",
                table: "tenants",
                type: "character varying(2)",
                maxLength: 2,
                nullable: false,
                defaultValue: "US");

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "tenants",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "USD");

            migrationBuilder.AddColumn<string>(
                name: "DateFormat",
                table: "tenants",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "MM/dd/yyyy");

            migrationBuilder.AddColumn<string>(
                name: "DefaultLanguage",
                table: "tenants",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "en");

            migrationBuilder.AddColumn<int>(
                name: "FirstDayOfWeek",
                table: "tenants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Locale",
                table: "tenants",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "en-US");

            migrationBuilder.AddColumn<int>(
                name: "MeasurementSystem",
                table: "tenants",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "SecondaryLanguages",
                table: "tenants",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalContractReference",
                table: "leases",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ExternalLastSyncedAt",
                table: "leases",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalRegistrationStatus",
                table: "leases",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalRegistryProvider",
                table: "leases",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TaxCode",
                table: "invoices",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TaxInclusive",
                table: "invoices",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TaxName",
                table: "invoices",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxPercentage",
                table: "invoices",
                type: "numeric(6,3)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TaxRateId",
                table: "invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "einvoice_submissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentType = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ExternalReference = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ProviderResponseJson = table.Column<string>(type: "text", nullable: true),
                    ErrorDetails = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    SubmittedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastAttemptAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_einvoice_submissions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "exchange_rates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BaseCurrency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    QuoteCurrency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Rate = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    EffectiveAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exchange_rates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tax_profiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CountryCode = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    Code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tax_profiles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tax_rates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TaxProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    RateCode = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Percentage = table.Column<decimal>(type: "numeric(6,3)", nullable: false),
                    IsInclusive = table.Column<bool>(type: "boolean", nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    EffectiveTo = table.Column<DateOnly>(type: "date", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tax_rates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tax_rates_tax_profiles_TaxProfileId",
                        column: x => x.TaxProfileId,
                        principalTable: "tax_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tenant_tax_profiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TaxProfileId = table.Column<Guid>(type: "uuid", nullable: true),
                    TaxRegistrationNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    LegalEntityName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    LegalAddressLine1 = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    LegalAddressLine2 = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    LegalCity = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LegalStateOrProvince = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LegalPostalCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    LegalCountryCode = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_tax_profiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tenant_tax_profiles_tax_profiles_TaxProfileId",
                        column: x => x.TaxProfileId,
                        principalTable: "tax_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_einvoice_submissions_InvoiceId",
                table: "einvoice_submissions",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_einvoice_submissions_TenantId_Status",
                table: "einvoice_submissions",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_exchange_rates_BaseCurrency_QuoteCurrency_EffectiveAt",
                table: "exchange_rates",
                columns: new[] { "BaseCurrency", "QuoteCurrency", "EffectiveAt" });

            migrationBuilder.CreateIndex(
                name: "IX_tax_profiles_Code",
                table: "tax_profiles",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tax_profiles_CountryCode",
                table: "tax_profiles",
                column: "CountryCode");

            migrationBuilder.CreateIndex(
                name: "IX_tax_rates_TaxProfileId_EffectiveFrom",
                table: "tax_rates",
                columns: new[] { "TaxProfileId", "EffectiveFrom" });

            migrationBuilder.CreateIndex(
                name: "IX_tax_rates_TaxProfileId_RateCode",
                table: "tax_rates",
                columns: new[] { "TaxProfileId", "RateCode" });

            migrationBuilder.CreateIndex(
                name: "IX_tenant_tax_profiles_TaxProfileId",
                table: "tenant_tax_profiles",
                column: "TaxProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_tax_profiles_TenantId",
                table: "tenant_tax_profiles",
                column: "TenantId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "einvoice_submissions");

            migrationBuilder.DropTable(
                name: "exchange_rates");

            migrationBuilder.DropTable(
                name: "tax_rates");

            migrationBuilder.DropTable(
                name: "tenant_tax_profiles");

            migrationBuilder.DropTable(
                name: "tax_profiles");

            migrationBuilder.DropColumn(
                name: "CountryCode",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "DateFormat",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "DefaultLanguage",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "FirstDayOfWeek",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "Locale",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "MeasurementSystem",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "SecondaryLanguages",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "ExternalContractReference",
                table: "leases");

            migrationBuilder.DropColumn(
                name: "ExternalLastSyncedAt",
                table: "leases");

            migrationBuilder.DropColumn(
                name: "ExternalRegistrationStatus",
                table: "leases");

            migrationBuilder.DropColumn(
                name: "ExternalRegistryProvider",
                table: "leases");

            migrationBuilder.DropColumn(
                name: "TaxCode",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "TaxInclusive",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "TaxName",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "TaxPercentage",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "TaxRateId",
                table: "invoices");
        }
    }
}

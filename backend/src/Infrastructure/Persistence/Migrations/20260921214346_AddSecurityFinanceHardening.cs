using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstateErp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSecurityFinanceHardening : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsReversed",
                table: "journal_entries",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "ReversalOfEntryId",
                table: "journal_entries",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PaidAmount",
                table: "expenses",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "expense_payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReceiptNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ExpenseId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PaymentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    RecordedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    IdempotencyKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    JournalEntryId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expense_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_expense_payments_expenses_ExpenseId",
                        column: x => x.ExpenseId,
                        principalTable: "expenses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "fiscal_periods",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ClosedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ClosedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fiscal_periods", x => x.Id);
                    table.CheckConstraint("CK_fiscal_periods_valid_range", "\"EndDate\" >= \"StartDate\"");
                });

            // Genuine range-overlap prevention (a simple unique index can't express "no other period's
            // date range may overlap mine") — btree_gist was already enabled by the Milestone 8 migration.
            migrationBuilder.Sql(
                "ALTER TABLE fiscal_periods ADD CONSTRAINT \"EX_fiscal_periods_no_overlap\" " +
                "EXCLUDE USING gist (\"TenantId\" WITH =, daterange(\"StartDate\", \"EndDate\", '[]') WITH &&);");

            migrationBuilder.CreateIndex(
                name: "IX_journal_entries_ReversalOfEntryId",
                table: "journal_entries",
                column: "ReversalOfEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_expense_payments_ExpenseId",
                table: "expense_payments",
                column: "ExpenseId");

            migrationBuilder.CreateIndex(
                name: "IX_expense_payments_TenantId_ExpenseId",
                table: "expense_payments",
                columns: new[] { "TenantId", "ExpenseId" });

            migrationBuilder.CreateIndex(
                name: "IX_expense_payments_TenantId_IdempotencyKey",
                table: "expense_payments",
                columns: new[] { "TenantId", "IdempotencyKey" },
                unique: true,
                filter: "\"IdempotencyKey\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_expense_payments_TenantId_ReceiptNumber",
                table: "expense_payments",
                columns: new[] { "TenantId", "ReceiptNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_fiscal_periods_TenantId_Status",
                table: "fiscal_periods",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.AddForeignKey(
                name: "FK_journal_entries_journal_entries_ReversalOfEntryId",
                table: "journal_entries",
                column: "ReversalOfEntryId",
                principalTable: "journal_entries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_journal_entries_journal_entries_ReversalOfEntryId",
                table: "journal_entries");

            migrationBuilder.DropTable(
                name: "expense_payments");

            migrationBuilder.Sql("ALTER TABLE fiscal_periods DROP CONSTRAINT IF EXISTS \"EX_fiscal_periods_no_overlap\";");

            migrationBuilder.DropTable(
                name: "fiscal_periods");

            migrationBuilder.DropIndex(
                name: "IX_journal_entries_ReversalOfEntryId",
                table: "journal_entries");

            migrationBuilder.DropColumn(
                name: "IsReversed",
                table: "journal_entries");

            migrationBuilder.DropColumn(
                name: "ReversalOfEntryId",
                table: "journal_entries");

            migrationBuilder.DropColumn(
                name: "PaidAmount",
                table: "expenses");
        }
    }
}

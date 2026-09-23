using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstateErp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExternalPortalFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PropertyOwnerId",
                table: "properties",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "portal_password_reset_tokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PortalUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UsedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_portal_password_reset_tokens", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "portal_refresh_tokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PortalUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByIp = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    RevokedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReplacedByTokenHash = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_portal_refresh_tokens", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "portal_users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    NormalizedEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    ActorType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false),
                    LockedOutUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastLoginAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_portal_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "property_owners",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_property_owners", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_properties_PropertyOwnerId",
                table: "properties",
                column: "PropertyOwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_properties_TenantId_PropertyOwnerId",
                table: "properties",
                columns: new[] { "TenantId", "PropertyOwnerId" });

            migrationBuilder.CreateIndex(
                name: "IX_portal_password_reset_tokens_PortalUserId",
                table: "portal_password_reset_tokens",
                column: "PortalUserId");

            migrationBuilder.CreateIndex(
                name: "IX_portal_password_reset_tokens_TokenHash",
                table: "portal_password_reset_tokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_portal_refresh_tokens_PortalUserId",
                table: "portal_refresh_tokens",
                column: "PortalUserId");

            migrationBuilder.CreateIndex(
                name: "IX_portal_refresh_tokens_TokenHash",
                table: "portal_refresh_tokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_portal_users_TenantId_ActorType_ActorId",
                table: "portal_users",
                columns: new[] { "TenantId", "ActorType", "ActorId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_portal_users_TenantId_NormalizedEmail",
                table: "portal_users",
                columns: new[] { "TenantId", "NormalizedEmail" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_property_owners_TenantId_IsActive",
                table: "property_owners",
                columns: new[] { "TenantId", "IsActive" });

            migrationBuilder.AddForeignKey(
                name: "FK_properties_property_owners_PropertyOwnerId",
                table: "properties",
                column: "PropertyOwnerId",
                principalTable: "property_owners",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_properties_property_owners_PropertyOwnerId",
                table: "properties");

            migrationBuilder.DropTable(
                name: "portal_password_reset_tokens");

            migrationBuilder.DropTable(
                name: "portal_refresh_tokens");

            migrationBuilder.DropTable(
                name: "portal_users");

            migrationBuilder.DropTable(
                name: "property_owners");

            migrationBuilder.DropIndex(
                name: "IX_properties_PropertyOwnerId",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_TenantId_PropertyOwnerId",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "PropertyOwnerId",
                table: "properties");
        }
    }
}

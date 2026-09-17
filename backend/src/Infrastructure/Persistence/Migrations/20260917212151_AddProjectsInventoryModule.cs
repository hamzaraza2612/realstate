using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstateErp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectsInventoryModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "projects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    AddressLine = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    State = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PostalCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: true),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Latitude = table.Column<decimal>(type: "numeric(9,6)", nullable: true),
                    Longitude = table.Column<decimal>(type: "numeric(9,6)", nullable: true),
                    GeoJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_projects", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "project_nodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentNodeId = table.Column<Guid>(type: "uuid", nullable: true),
                    NodeType = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Latitude = table.Column<decimal>(type: "numeric(9,6)", nullable: true),
                    Longitude = table.Column<decimal>(type: "numeric(9,6)", nullable: true),
                    GeoJson = table.Column<string>(type: "text", nullable: true),
                    MetadataJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_nodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_project_nodes_project_nodes_ParentNodeId",
                        column: x => x.ParentNodeId,
                        principalTable: "project_nodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_project_nodes_projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "inventory_units",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    NodeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    AreaSize = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    AreaUnit = table.Column<int>(type: "integer", nullable: true),
                    Latitude = table.Column<decimal>(type: "numeric(9,6)", nullable: true),
                    Longitude = table.Column<decimal>(type: "numeric(9,6)", nullable: true),
                    GeoJson = table.Column<string>(type: "text", nullable: true),
                    MetadataJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_units", x => x.Id);
                    table.ForeignKey(
                        name: "FK_inventory_units_project_nodes_NodeId",
                        column: x => x.NodeId,
                        principalTable: "project_nodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inventory_units_projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_inventory_units_NodeId",
                table: "inventory_units",
                column: "NodeId");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_units_ProjectId_Code",
                table: "inventory_units",
                columns: new[] { "ProjectId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_inventory_units_TenantId_NodeId",
                table: "inventory_units",
                columns: new[] { "TenantId", "NodeId" });

            migrationBuilder.CreateIndex(
                name: "IX_inventory_units_TenantId_ProjectId_Status",
                table: "inventory_units",
                columns: new[] { "TenantId", "ProjectId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_inventory_units_TenantId_Type",
                table: "inventory_units",
                columns: new[] { "TenantId", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_project_nodes_ParentNodeId",
                table: "project_nodes",
                column: "ParentNodeId");

            migrationBuilder.CreateIndex(
                name: "IX_project_nodes_ProjectId_Code",
                table: "project_nodes",
                columns: new[] { "ProjectId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_project_nodes_TenantId_ParentNodeId",
                table: "project_nodes",
                columns: new[] { "TenantId", "ParentNodeId" });

            migrationBuilder.CreateIndex(
                name: "IX_project_nodes_TenantId_ProjectId",
                table: "project_nodes",
                columns: new[] { "TenantId", "ProjectId" });

            migrationBuilder.CreateIndex(
                name: "IX_projects_TenantId_Code",
                table: "projects",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_projects_TenantId_Status",
                table: "projects",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_projects_TenantId_Type",
                table: "projects",
                columns: new[] { "TenantId", "Type" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "inventory_units");

            migrationBuilder.DropTable(
                name: "project_nodes");

            migrationBuilder.DropTable(
                name: "projects");
        }
    }
}

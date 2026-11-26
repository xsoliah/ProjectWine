using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WineCellar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWineRacks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StorageLocation",
                table: "wines");

            migrationBuilder.CreateTable(
                name: "racks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    NormalizedName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Height = table.Column<int>(type: "int", nullable: false),
                    Width = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_racks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_racks_AspNetUsers_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "rack_slots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RackId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Row = table.Column<int>(type: "int", nullable: false),
                    Column = table.Column<int>(type: "int", nullable: false),
                    WineId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rack_slots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_rack_slots_racks_RackId",
                        column: x => x.RackId,
                        principalTable: "racks",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_rack_slots_wines_WineId",
                        column: x => x.WineId,
                        principalTable: "wines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_rack_slots_OwnerId",
                table: "rack_slots",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_rack_slots_RackId_Row_Column",
                table: "rack_slots",
                columns: new[] { "RackId", "Row", "Column" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rack_slots_WineId",
                table: "rack_slots",
                column: "WineId");

            migrationBuilder.CreateIndex(
                name: "IX_racks_OwnerId_NormalizedName",
                table: "racks",
                columns: new[] { "OwnerId", "NormalizedName" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "rack_slots");

            migrationBuilder.DropTable(
                name: "racks");

            migrationBuilder.AddColumn<string>(
                name: "StorageLocation",
                table: "wines",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);
        }
    }
}

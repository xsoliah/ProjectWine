using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WineCellar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPhotoCapture : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LabelCornersJson",
                table: "wines",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LabelImageId",
                table: "wines",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LabelSourceImageId",
                table: "wines",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "capture_drafts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    FrontImageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BackImageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BottleCount = table.Column<int>(type: "int", nullable: false),
                    UserNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ResultJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SourcesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LabelCornersJson = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    LabelPreviewImageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Error = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Attempts = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Version = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_capture_drafts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_capture_drafts_AspNetUsers_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "capture_usage",
                columns: table => new
                {
                    OwnerId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Day = table.Column<DateOnly>(type: "date", nullable: false),
                    Count = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_capture_usage", x => new { x.OwnerId, x.Day });
                    table.ForeignKey(
                        name: "FK_capture_usage_AspNetUsers_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "stored_images",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Data = table.Column<byte[]>(type: "varbinary(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stored_images", x => x.Id);
                    table.ForeignKey(
                        name: "FK_stored_images_AspNetUsers_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_wines_LabelImageId",
                table: "wines",
                column: "LabelImageId");

            migrationBuilder.CreateIndex(
                name: "IX_capture_drafts_OwnerId_CreatedAt",
                table: "capture_drafts",
                columns: new[] { "OwnerId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_capture_drafts_Status_CreatedAt",
                table: "capture_drafts",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_stored_images_OwnerId",
                table: "stored_images",
                column: "OwnerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "capture_drafts");

            migrationBuilder.DropTable(
                name: "capture_usage");

            migrationBuilder.DropTable(
                name: "stored_images");

            migrationBuilder.DropIndex(
                name: "IX_wines_LabelImageId",
                table: "wines");

            migrationBuilder.DropColumn(
                name: "LabelCornersJson",
                table: "wines");

            migrationBuilder.DropColumn(
                name: "LabelImageId",
                table: "wines");

            migrationBuilder.DropColumn(
                name: "LabelSourceImageId",
                table: "wines");
        }
    }
}

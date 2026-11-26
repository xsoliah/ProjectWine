using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WineCellar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBottleShape : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BottleImageId",
                table: "wines",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BottleShapeJson",
                table: "wines",
                type: "nvarchar(max)",
                maxLength: 8000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "BottleImageId",
                table: "capture_drafts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BottleShapeJson",
                table: "capture_drafts",
                type: "nvarchar(max)",
                maxLength: 8000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BottleImageId",
                table: "wines");

            migrationBuilder.DropColumn(
                name: "BottleShapeJson",
                table: "wines");

            migrationBuilder.DropColumn(
                name: "BottleImageId",
                table: "capture_drafts");

            migrationBuilder.DropColumn(
                name: "BottleShapeJson",
                table: "capture_drafts");
        }
    }
}

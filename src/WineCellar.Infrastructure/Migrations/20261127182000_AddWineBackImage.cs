using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WineCellar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWineBackImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BackImageId",
                table: "wines",
                type: "uniqueidentifier",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BackImageId",
                table: "wines");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WineCellar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDrinkingCurve : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DrinkPeak",
                table: "wines",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DrinkSpread",
                table: "wines",
                type: "float",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DrinkPeak",
                table: "wines");

            migrationBuilder.DropColumn(
                name: "DrinkSpread",
                table: "wines");
        }
    }
}

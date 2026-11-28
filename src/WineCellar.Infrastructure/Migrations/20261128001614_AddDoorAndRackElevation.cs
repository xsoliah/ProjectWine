using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WineCellar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDoorAndRackElevation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ElevationCm",
                table: "racks",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "DoorOffsetCm",
                table: "cellar_rooms",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DoorWall",
                table: "cellar_rooms",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ElevationCm",
                table: "racks");

            migrationBuilder.DropColumn(
                name: "DoorOffsetCm",
                table: "cellar_rooms");

            migrationBuilder.DropColumn(
                name: "DoorWall",
                table: "cellar_rooms");
        }
    }
}

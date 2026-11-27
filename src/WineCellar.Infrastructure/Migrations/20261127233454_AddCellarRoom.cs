using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WineCellar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCellarRoom : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PosX",
                table: "racks",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PosZ",
                table: "racks",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Rotation",
                table: "racks",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "cellar_rooms",
                columns: table => new
                {
                    OwnerId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    WidthCm = table.Column<int>(type: "int", nullable: false),
                    DepthCm = table.Column<int>(type: "int", nullable: false),
                    HeightCm = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cellar_rooms", x => x.OwnerId);
                    table.ForeignKey(
                        name: "FK_cellar_rooms_AspNetUsers_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cellar_rooms");

            migrationBuilder.DropColumn(
                name: "PosX",
                table: "racks");

            migrationBuilder.DropColumn(
                name: "PosZ",
                table: "racks");

            migrationBuilder.DropColumn(
                name: "Rotation",
                table: "racks");
        }
    }
}

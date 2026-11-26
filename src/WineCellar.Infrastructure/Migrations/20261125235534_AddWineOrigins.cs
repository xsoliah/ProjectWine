using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WineCellar.Infrastructure.Migrations
{
    /// <summary>
    /// Replaces the free-text columns wines.Country / wines.Region by per-user origin master data
    /// (countries, regions) and takes over the existing texts.
    /// </summary>
    public partial class AddWineOrigins : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CountryId",
                table: "wines",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RegionId",
                table: "wines",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "countries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    NormalizedName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_countries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_countries_AspNetUsers_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "regions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CountryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    NormalizedName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_regions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_regions_countries_CountryId",
                        column: x => x.CountryId,
                        principalTable: "countries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Take over the former free-text origins: one country per owner and (case-insensitive) name,
            // one region per country and name. A region without a country gets the country "Unbekannt".
            migrationBuilder.Sql("""
                INSERT INTO countries (Id, OwnerId, Name, NormalizedName)
                SELECT NEWID(), OwnerId, MIN(LTRIM(RTRIM(Country))), UPPER(LTRIM(RTRIM(Country)))
                FROM wines
                WHERE LTRIM(RTRIM(ISNULL(Country, ''))) <> ''
                GROUP BY OwnerId, UPPER(LTRIM(RTRIM(Country)));

                INSERT INTO countries (Id, OwnerId, Name, NormalizedName)
                SELECT NEWID(), w.OwnerId, N'Unbekannt', N'UNBEKANNT'
                FROM wines w
                WHERE LTRIM(RTRIM(ISNULL(w.Country, ''))) = '' AND LTRIM(RTRIM(ISNULL(w.Region, ''))) <> ''
                  AND NOT EXISTS (SELECT 1 FROM countries c WHERE c.OwnerId = w.OwnerId AND c.NormalizedName = N'UNBEKANNT')
                GROUP BY w.OwnerId;

                UPDATE w SET CountryId = c.Id
                FROM wines w
                JOIN countries c ON c.OwnerId = w.OwnerId
                 AND c.NormalizedName = CASE WHEN LTRIM(RTRIM(ISNULL(w.Country, ''))) = '' THEN N'UNBEKANNT'
                                             ELSE UPPER(LTRIM(RTRIM(w.Country))) END
                WHERE LTRIM(RTRIM(ISNULL(w.Country, ''))) <> '' OR LTRIM(RTRIM(ISNULL(w.Region, ''))) <> '';

                INSERT INTO regions (Id, CountryId, OwnerId, Name, NormalizedName)
                SELECT NEWID(), CountryId, OwnerId, MIN(LEFT(LTRIM(RTRIM(Region)), 100)), UPPER(LEFT(LTRIM(RTRIM(Region)), 100))
                FROM wines
                WHERE CountryId IS NOT NULL AND LTRIM(RTRIM(ISNULL(Region, ''))) <> ''
                GROUP BY CountryId, OwnerId, UPPER(LEFT(LTRIM(RTRIM(Region)), 100));

                UPDATE w SET RegionId = r.Id
                FROM wines w
                JOIN regions r ON r.CountryId = w.CountryId AND r.NormalizedName = UPPER(LEFT(LTRIM(RTRIM(w.Region)), 100))
                WHERE LTRIM(RTRIM(ISNULL(w.Region, ''))) <> '';
                """);

            migrationBuilder.DropColumn(
                name: "Country",
                table: "wines");

            migrationBuilder.DropColumn(
                name: "Region",
                table: "wines");

            migrationBuilder.CreateIndex(
                name: "IX_wines_CountryId",
                table: "wines",
                column: "CountryId");

            migrationBuilder.CreateIndex(
                name: "IX_wines_RegionId",
                table: "wines",
                column: "RegionId");

            migrationBuilder.CreateIndex(
                name: "IX_countries_OwnerId_NormalizedName",
                table: "countries",
                columns: new[] { "OwnerId", "NormalizedName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_regions_CountryId_NormalizedName",
                table: "regions",
                columns: new[] { "CountryId", "NormalizedName" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_wines_countries_CountryId",
                table: "wines",
                column: "CountryId",
                principalTable: "countries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_wines_regions_RegionId",
                table: "wines",
                column: "RegionId",
                principalTable: "regions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "wines",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Region",
                table: "wines",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE w SET Country = c.Name, Region = r.Name
                FROM wines w
                LEFT JOIN countries c ON c.Id = w.CountryId
                LEFT JOIN regions r ON r.Id = w.RegionId;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_wines_countries_CountryId",
                table: "wines");

            migrationBuilder.DropForeignKey(
                name: "FK_wines_regions_RegionId",
                table: "wines");

            migrationBuilder.DropTable(
                name: "regions");

            migrationBuilder.DropTable(
                name: "countries");

            migrationBuilder.DropIndex(
                name: "IX_wines_CountryId",
                table: "wines");

            migrationBuilder.DropIndex(
                name: "IX_wines_RegionId",
                table: "wines");

            migrationBuilder.DropColumn(
                name: "CountryId",
                table: "wines");

            migrationBuilder.DropColumn(
                name: "RegionId",
                table: "wines");
        }
    }
}

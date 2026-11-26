using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WineCellar.Infrastructure.Migrations
{
    /// <summary>
    /// Replaces the free-text column wines.Grapes by per-user grape varieties (grape_varieties) and an
    /// ordered assignment (wine_grapes), taking over the existing texts.
    /// </summary>
    public partial class AddGrapeVarieties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "grape_varieties",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    NormalizedName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_grape_varieties", x => x.Id);
                    table.ForeignKey(
                        name: "FK_grape_varieties_AspNetUsers_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "wine_grapes",
                columns: table => new
                {
                    WineId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GrapeVarietyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Position = table.Column<int>(type: "int", nullable: false),
                    Percent = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_wine_grapes", x => new { x.WineId, x.GrapeVarietyId });
                    table.ForeignKey(
                        name: "FK_wine_grapes_grape_varieties_GrapeVarietyId",
                        column: x => x.GrapeVarietyId,
                        principalTable: "grape_varieties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_wine_grapes_wines_WineId",
                        column: x => x.WineId,
                        principalTable: "wines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Take over the free texts with the same rule as GrapeText.Split: separators , ; / & and " und ",
            // trimmed, empty parts dropped, case-insensitive duplicates within a wine kept once (first position).
            // OPENJSON keeps the order ([key]) and works from SQL Server 2016 on, unlike STRING_SPLIT's ordinal.
            migrationBuilder.Sql("""
                CREATE TABLE #parts (WineId uniqueidentifier, OwnerId nvarchar(450), Ord int, Name nvarchar(100));

                INSERT INTO #parts (WineId, OwnerId, Ord, Name)
                SELECT w.Id, w.OwnerId, CAST(j.[key] AS int), LEFT(LTRIM(RTRIM(j.[value])), 100)
                FROM wines w
                CROSS APPLY (SELECT REPLACE(REPLACE(REPLACE(REPLACE(w.Grapes, N';', N','), N'/', N','), N'&', N','), N' und ', N',') AS t) n
                CROSS APPLY OPENJSON(N'["' + REPLACE(STRING_ESCAPE(n.t, 'json'), N',', N'","') + N'"]') j
                WHERE LTRIM(RTRIM(ISNULL(w.Grapes, N''))) <> N'';

                DELETE FROM #parts WHERE Name = N'';

                INSERT INTO grape_varieties (Id, OwnerId, Name, NormalizedName)
                -- Binary MIN prefers "Merlot" over "merlot" (upper case sorts first).
                SELECT NEWID(), OwnerId, MIN(Name COLLATE Latin1_General_BIN2), UPPER(Name)
                FROM #parts
                GROUP BY OwnerId, UPPER(Name);

                INSERT INTO wine_grapes (WineId, GrapeVarietyId, Position, [Percent])
                SELECT x.WineId, x.GrapeVarietyId, ROW_NUMBER() OVER (PARTITION BY x.WineId ORDER BY x.Ord) - 1, NULL
                FROM (
                    SELECT p.WineId, g.Id AS GrapeVarietyId, MIN(p.Ord) AS Ord
                    FROM #parts p
                    JOIN grape_varieties g ON g.OwnerId = p.OwnerId AND g.NormalizedName = UPPER(p.Name)
                    GROUP BY p.WineId, g.Id
                ) x;

                DROP TABLE #parts;
                """);

            migrationBuilder.DropColumn(
                name: "Grapes",
                table: "wines");

            migrationBuilder.CreateIndex(
                name: "IX_grape_varieties_OwnerId_NormalizedName",
                table: "grape_varieties",
                columns: new[] { "OwnerId", "NormalizedName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_wine_grapes_GrapeVarietyId",
                table: "wine_grapes",
                column: "GrapeVarietyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Grapes",
                table: "wines",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            // Rebuild the text in the stored order, e.g. "Cabernet Sauvignon 85 %, Cabernet Franc 15 %".
            migrationBuilder.Sql("""
                UPDATE w SET Grapes = LEFT(x.Text, 300)
                FROM wines w
                JOIN (
                    SELECT wg.WineId,
                           STRING_AGG(g.Name + CASE WHEN wg.[Percent] IS NULL THEN N'' ELSE N' ' + CAST(wg.[Percent] AS nvarchar(3)) + N' %' END, N', ')
                               WITHIN GROUP (ORDER BY wg.Position) AS Text
                    FROM wine_grapes wg
                    JOIN grape_varieties g ON g.Id = wg.GrapeVarietyId
                    GROUP BY wg.WineId
                ) x ON x.WineId = w.Id;
                """);

            migrationBuilder.DropTable(
                name: "wine_grapes");

            migrationBuilder.DropTable(
                name: "grape_varieties");
        }
    }
}

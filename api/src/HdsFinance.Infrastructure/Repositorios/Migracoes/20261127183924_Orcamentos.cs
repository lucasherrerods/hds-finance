using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HdsFinance.Infrastructure.Repositorios.Migracoes
{
    /// <inheritdoc />
    public partial class Orcamentos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Orcamentos",
                columns: table => new
                {
                    Grupo = table.Column<string>(type: "text", nullable: false),
                    Limite = table.Column<string>(type: "character varying(64)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orcamentos", x => x.Grupo);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Orcamentos");
        }
    }
}

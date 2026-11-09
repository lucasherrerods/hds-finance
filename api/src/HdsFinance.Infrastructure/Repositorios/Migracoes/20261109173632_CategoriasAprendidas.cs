using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HdsFinance.Infrastructure.Repositorios.Migracoes
{
    /// <inheritdoc />
    public partial class CategoriasAprendidas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CategoriasAprendidas",
                columns: table => new
                {
                    Chave = table.Column<string>(type: "TEXT", nullable: false),
                    Descricao = table.Column<string>(type: "TEXT", nullable: false),
                    Categoria = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CategoriasAprendidas", x => x.Chave);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CategoriasAprendidas");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HdsFinance.Infrastructure.Repositorios.Migracoes
{
    /// <inheritdoc />
    public partial class AjustesDaTransacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Categoria",
                table: "Transacoes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Oculta",
                table: "Transacoes",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Categoria",
                table: "Transacoes");

            migrationBuilder.DropColumn(
                name: "Oculta",
                table: "Transacoes");
        }
    }
}

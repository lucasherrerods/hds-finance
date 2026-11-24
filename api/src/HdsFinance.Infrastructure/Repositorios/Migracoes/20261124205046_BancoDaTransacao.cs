using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HdsFinance.Infrastructure.Repositorios.Migracoes
{
    /// <inheritdoc />
    public partial class BancoDaTransacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Banco",
                table: "Transacoes",
                type: "text",
                nullable: false,
                defaultValue: "Inter");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Banco",
                table: "Transacoes");
        }
    }
}

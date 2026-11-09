using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HdsFinance.Infrastructure.Repositorios;

/// <summary>Usada só pelo `dotnet ef` para criar migrações, sem precisar subir a api.</summary>
public sealed class FabricaDoBancoParaMigracoes : IDesignTimeDbContextFactory<BancoDoModoPessoal>
{
    public BancoDoModoPessoal CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<BancoDoModoPessoal>().UseSqlite("Data Source=migracoes.db").Options);
}

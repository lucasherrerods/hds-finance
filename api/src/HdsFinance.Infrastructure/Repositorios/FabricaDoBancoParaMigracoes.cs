using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HdsFinance.Infrastructure.Repositorios;

/// <summary>Usada só pelo `dotnet ef` para criar migrações, sem precisar subir a api.</summary>
public sealed class FabricaDoBancoParaMigracoes : IDesignTimeDbContextFactory<BancoDoAdmin>
{
    public BancoDoAdmin CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<BancoDoAdmin>().UseNpgsql("Host=localhost;Database=hds_finance_migracoes").Options);
}

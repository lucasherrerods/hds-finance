using FluentAssertions;
using HdsFinance.Infrastructure.Repositorios;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace HdsFinance.Infrastructure.Tests.Repositorios;

public sealed class OrcamentosPostgresTestes : IDisposable
{
    private readonly SqliteConnection _conexao = new("DataSource=:memory:");

    public OrcamentosPostgresTestes()
    {
        _conexao.Open();
        using var banco = NovoBanco();
        banco.Database.EnsureCreated();
    }

    public void Dispose() => _conexao.Dispose();

    private BancoDoAdmin NovoBanco() =>
        new(new DbContextOptionsBuilder<BancoDoAdmin>().UseSqlite(_conexao).Options);

    [Fact]
    public async Task Guarda_troca_e_tira_o_limite_entre_conexoes()
    {
        await using (var banco = NovoBanco())
        {
            var orcamentos = new OrcamentosPostgres(banco);
            await orcamentos.DefinirAsync("Lazer", 300m);
            await orcamentos.DefinirAsync("Transporte", 200.50m);
            await orcamentos.DefinirAsync("Lazer", 250m);
            await orcamentos.DefinirAsync("Transporte", null);
        }

        await using var outro = NovoBanco();
        (await new OrcamentosPostgres(outro).ListarAsync()).Should().Equal(new Dictionary<string, decimal> { ["Lazer"] = 250m });
    }
}

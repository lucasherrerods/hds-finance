using FluentAssertions;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Repositorios;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace HdsFinance.Infrastructure.Tests.Repositorios;

/// <summary>SQLite em memória com as migrações de verdade aplicadas: testa o esquema junto.</summary>
public sealed class RepositorioSqliteTestes : IDisposable
{
    private readonly SqliteConnection _conexao = new("DataSource=:memory:");

    public RepositorioSqliteTestes()
    {
        _conexao.Open();
        using var banco = NovoBanco();
        banco.Database.Migrate();
    }

    public void Dispose() => _conexao.Dispose();

    private BancoDoModoPessoal NovoBanco() =>
        new(new DbContextOptionsBuilder<BancoDoModoPessoal>().UseSqlite(_conexao).Options);

    private static readonly Transacao Salario = new(new DateOnly(2026, 10, 1), 3500.10m, "Salário", TipoDeTransacao.Comum, "F1");
    private static readonly Transacao Aplicacao = new(new DateOnly(2026, 10, 9), -1000m, "Aplicação CDB", TipoDeTransacao.MovimentacaoDeInvestimento);

    [Fact]
    public async Task Guarda_e_lista_as_transacoes_entre_conexoes()
    {
        await using (var banco = NovoBanco())
        {
            await new RepositorioSqlite(banco).AdicionarAsync([Salario, Aplicacao]);
        }

        await using var outro = NovoBanco();
        (await new RepositorioSqlite(outro).ListarAsync()).Should().Equal(Salario, Aplicacao);
    }

    [Fact]
    public async Task Informa_so_as_chaves_que_ja_existem()
    {
        await using var banco = NovoBanco();
        var repositorio = new RepositorioSqlite(banco);
        await repositorio.AdicionarAsync([Salario]);

        var existentes = await repositorio.ChavesExistentesAsync([Salario.ChaveDeDeduplicacao, Aplicacao.ChaveDeDeduplicacao]);

        existentes.Should().BeEquivalentTo([Salario.ChaveDeDeduplicacao]);
    }

    [Fact]
    public async Task A_cobertura_e_a_do_extrato_que_vai_mais_longe()
    {
        await using var banco = NovoBanco();
        var registro = new RegistroSqlite(banco);
        await registro.RegistrarExtratoAsync(new DateOnly(2026, 10, 31), 2000m);
        await registro.RegistrarExtratoAsync(new DateOnly(2026, 9, 30), 1500m);
        await registro.RegistrarExtratoAsync(null, null);

        var cobertura = await registro.CoberturaAsync();

        cobertura.CobertoAte.Should().Be(new DateOnly(2026, 10, 31));
        cobertura.SaldoFinal.Should().Be(2000m);
    }

    [Fact]
    public async Task Sem_extrato_a_cobertura_e_vazia()
    {
        await using var banco = NovoBanco();

        (await new RegistroSqlite(banco).CoberturaAsync()).Should().Be(new HdsFinance.Application.ModoPessoal.CoberturaDoHistorico(null, null));
    }

    [Fact]
    public async Task Lembra_os_meses_enviados_e_aceita_reenvio_forcado()
    {
        var outubro = new MesDeReferencia(2026, 10);
        await using var banco = NovoBanco();
        var registro = new RegistroSqlite(banco);

        await registro.MarcarEnviadoAsync(outubro, DateTimeOffset.UnixEpoch);
        await registro.MarcarEnviadoAsync(outubro, DateTimeOffset.UnixEpoch.AddDays(1));

        (await registro.JaEnviadoAsync(outubro)).Should().BeTrue();
        (await registro.JaEnviadoAsync(new MesDeReferencia(2026, 9))).Should().BeFalse();
    }

    [Fact]
    public async Task Guarda_uma_correcao_por_descricao_e_a_ultima_vence()
    {
        await using var banco = NovoBanco();
        var aprendidas = new CategoriasAprendidasSqlite(banco);

        await aprendidas.SalvarAsync(new CategoriaAprendida("Pix enviado João", "Moradia"));
        await aprendidas.SalvarAsync(new CategoriaAprendida("PIX ENVIADO JOAO", "Lazer"));

        (await aprendidas.ListarAsync()).Should().ContainSingle().Which.Should().Be(new CategoriaAprendida("PIX ENVIADO JOAO", "Lazer"));
    }
}

using FluentAssertions;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Repositorios;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace HdsFinance.Infrastructure.Tests.Repositorios;

/// <summary>SQLite em memória com o mesmo modelo do Postgres: as consultas do EF são as mesmas nos dois.</summary>
public sealed class RepositorioPostgresTestes : IDisposable
{
    private readonly SqliteConnection _conexao = new("DataSource=:memory:");

    public RepositorioPostgresTestes()
    {
        _conexao.Open();
        using var banco = NovoBanco();
        banco.Database.EnsureCreated();
    }

    public void Dispose() => _conexao.Dispose();

    private BancoDoAdmin NovoBanco() =>
        new(new DbContextOptionsBuilder<BancoDoAdmin>().UseSqlite(_conexao).Options);

    private static readonly Transacao Salario = new(new DateOnly(2026, 10, 1), 3500.10m, "Salário", TipoDeTransacao.Comum, "F1");
    private static readonly Transacao Aplicacao = new(new DateOnly(2026, 10, 9), -1000m, "Aplicação CDB", TipoDeTransacao.MovimentacaoDeInvestimento);

    [Fact]
    public async Task Guarda_e_lista_as_transacoes_entre_conexoes()
    {
        await using (var banco = NovoBanco())
        {
            await new RepositorioPostgres(banco).AdicionarAsync([Salario, Aplicacao]);
        }

        await using var outro = NovoBanco();
        (await new RepositorioPostgres(outro).ListarAsync()).Should().Equal(Salario, Aplicacao);
    }

    [Fact]
    public async Task Informa_so_as_chaves_que_ja_existem()
    {
        await using var banco = NovoBanco();
        var repositorio = new RepositorioPostgres(banco);
        await repositorio.AdicionarAsync([Salario]);

        var existentes = await repositorio.ChavesExistentesAsync([Salario.ChaveDeDeduplicacao, Aplicacao.ChaveDeDeduplicacao]);

        existentes.Should().BeEquivalentTo([Salario.ChaveDeDeduplicacao]);
    }

    [Fact]
    public async Task A_cobertura_e_a_do_extrato_que_vai_mais_longe()
    {
        await using var banco = NovoBanco();
        var registro = new RegistroPostgres(banco);
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

        (await new RegistroPostgres(banco).CoberturaAsync()).Should().Be(new HdsFinance.Application.Admin.CoberturaDoHistorico(null, null));
    }

    [Fact]
    public async Task Lembra_os_meses_enviados_e_aceita_reenvio_forcado()
    {
        var outubro = new MesDeReferencia(2026, 10);
        await using var banco = NovoBanco();
        var registro = new RegistroPostgres(banco);

        await registro.MarcarEnviadoAsync(outubro, DateTimeOffset.UnixEpoch);
        await registro.MarcarEnviadoAsync(outubro, DateTimeOffset.UnixEpoch.AddDays(1));

        (await registro.JaEnviadoAsync(outubro)).Should().BeTrue();
        (await registro.JaEnviadoAsync(new MesDeReferencia(2026, 9))).Should().BeFalse();
    }

    [Fact]
    public async Task Guarda_uma_correcao_por_descricao_e_a_ultima_vence()
    {
        await using var banco = NovoBanco();
        var aprendidas = new CategoriasAprendidasPostgres(banco);

        await aprendidas.SalvarAsync(new CategoriaAprendida("Pix enviado João", "Moradia"));
        await aprendidas.SalvarAsync(new CategoriaAprendida("PIX ENVIADO JOAO", "Lazer"));

        (await aprendidas.ListarAsync()).Should().ContainSingle().Which.Should().Be(new CategoriaAprendida("PIX ENVIADO JOAO", "Lazer"));
    }

    [Fact]
    public async Task Apaga_uma_transacao_pelo_dia_valor_e_descricao()
    {
        await using var banco = NovoBanco();
        var repositorio = new RepositorioPostgres(banco);
        await repositorio.AdicionarAsync([Salario, Aplicacao]);

        (await repositorio.RemoverAsync(Salario.Data, 3500.1m, Salario.Descricao)).Should().BeTrue();
        (await repositorio.RemoverAsync(Salario.Data, 3500.1m, Salario.Descricao)).Should().BeFalse();

        (await repositorio.ListarAsync()).Should().Equal(Aplicacao);
    }

    [Fact]
    public async Task Apaga_so_as_transacoes_do_mes_pedido()
    {
        var setembro = new Transacao(new DateOnly(2026, 9, 30), -10m, "Padaria", TipoDeTransacao.Comum);
        await using var banco = NovoBanco();
        var repositorio = new RepositorioPostgres(banco);
        await repositorio.AdicionarAsync([setembro, Salario, Aplicacao]);

        (await repositorio.RemoverMesAsync(new MesDeReferencia(2026, 10))).Should().Be(2);

        (await repositorio.ListarAsync()).Should().Equal(setembro);
    }
}

using FluentAssertions;
using HdsFinance.Application.Extratos;
using HdsFinance.Application.Admin;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;

namespace HdsFinance.Application.Tests.Admin;

public class ConsultarHistoricoTestes
{
    private static ConsultarHistorico Montar(
        IReadOnlyList<Transacao> transacoes, RegistroFalso? registro = null, OrcamentosFalsos? orcamentos = null, DateOnly? hoje = null)
    {
        var repositorio = Substitute.For<IRepositorioDeTransacoes>();
        repositorio.ListarAsync(Arg.Any<CancellationToken>()).Returns(transacoes);
        var tempo = new FakeTimeProvider(new DateTimeOffset((hoje ?? new DateOnly(2027, 6, 1)).ToDateTime(new TimeOnly(12, 0)), TimeSpan.Zero));
        var fechar = new FecharMes(repositorio, registro ??= new RegistroFalso(), new GerarRelatorio(Substitute.For<IGeradorDeRelatorio>(), tempo),
            Substitute.For<INotificador>(), tempo);
        return new ConsultarHistorico(repositorio, fechar, registro, orcamentos ?? new OrcamentosFalsos(), tempo);
    }

    private static Transacao Gasto(int ano, int mes) => new(new DateOnly(ano, mes, 10), -50m, "Mercado", TipoDeTransacao.Comum);

    [Fact]
    public async Task Devolve_todos_os_meses_guardados_com_o_painel_do_mais_recente()
    {
        var transacoes = Enumerable.Range(0, 15).Select(i => Gasto(2025 + (i + 6) / 12, (i + 6) % 12 + 1)).ToList();

        var historico = await Montar(transacoes).ExecutarAsync();

        historico.Meses.Should().HaveCount(15);
        historico.Meses[0].Mes.Should().Be(new MesDeReferencia(2025, 7));
        historico.Meses[^1].Mes.Should().Be(new MesDeReferencia(2026, 9));
        historico.Painel!.Mes.Should().Be(new MesDeReferencia(2026, 9));
        historico.Transacoes.Should().HaveCount(15);
    }

    [Fact]
    public async Task Traz_o_saldo_da_conta_informado_pelo_banco()
    {
        var registro = new RegistroFalso();
        await registro.RegistrarExtratoAsync(new DateOnly(2026, 10, 31), 250m);

        var historico = await Montar([Gasto(2026, 10)], registro).ExecutarAsync();

        historico.Saldo.Should().Be(new SaldoDaConta(250m, new DateOnly(2026, 10, 31), Informado: true, AntesDoHistorico: 300m));
    }

    [Fact]
    public async Task Traz_as_faturas_incluidas()
    {
        var fatura = new Fatura(new DateOnly(2026, 11, 2), 10m, 0m, 0m, 10m,
            [new CartaoDaFatura(10m, [new LinhaDaFatura(new DateOnly(2026, 10, 5), "LANCHE", -10m)])]);

        var historico = await Montar([Gasto(2026, 10), .. fatura.ParaTransacoes()]).ExecutarAsync();

        historico.Faturas.Should().ContainSingle().Which.Total.Should().Be(10m);
    }

    [Fact]
    public async Task Sem_transacoes_o_historico_fica_vazio()
    {
        var historico = await Montar([]).ExecutarAsync();

        historico.Meses.Should().BeEmpty();
        historico.Painel.Should().BeNull();
        historico.Transacoes.Should().BeEmpty();
    }

    [Fact]
    public async Task Traz_o_orcamento_e_as_recorrentes_do_mes_mais_recente()
    {
        var orcamentos = new OrcamentosFalsos();
        await orcamentos.DefinirAsync("Alimentação", 100m);
        Transacao Spotify(int mes) => new(new DateOnly(2026, mes, 9), -12.90m, "EBN SPOTIFY", TipoDeTransacao.Comum);

        var historico = await Montar([Spotify(8), Spotify(9), Spotify(10), Gasto(2026, 10)], orcamentos: orcamentos).ExecutarAsync();

        historico.Orcamento.Should().ContainSingle().Which.Should().Be(new OrcamentoDoGrupo("Alimentação", 100m, 50m, 50m, SituacaoDoOrcamento.Tranquilo));
        historico.Recorrentes.Should().ContainSingle().Which.Situacao.Should().Be(SituacaoDaRecorrente.Paga);
    }

    [Fact]
    public async Task So_projeta_quando_o_mes_mais_recente_e_o_de_hoje()
    {
        (await Montar([Gasto(2026, 10)], hoje: new DateOnly(2026, 10, 20)).ExecutarAsync()).Projecao.Should().NotBeNull();
        (await Montar([Gasto(2026, 10)], hoje: new DateOnly(2026, 11, 3)).ExecutarAsync()).Projecao.Should().BeNull();
    }
}

internal sealed class OrcamentosFalsos : IRepositorioDeOrcamentos
{
    private readonly Dictionary<string, decimal> _limites = [];

    public Task<IReadOnlyDictionary<string, decimal>> ListarAsync(CancellationToken cancelamento = default) =>
        Task.FromResult<IReadOnlyDictionary<string, decimal>>(new Dictionary<string, decimal>(_limites));

    public Task DefinirAsync(string grupo, decimal? limite, CancellationToken cancelamento = default)
    {
        if (limite is { } valor)
        {
            _limites[grupo] = valor;
        }
        else
        {
            _limites.Remove(grupo);
        }

        return Task.CompletedTask;
    }
}

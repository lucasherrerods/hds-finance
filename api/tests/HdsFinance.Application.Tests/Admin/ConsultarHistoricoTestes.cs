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
    private static ConsultarHistorico Montar(IReadOnlyList<Transacao> transacoes)
    {
        var repositorio = Substitute.For<IRepositorioDeTransacoes>();
        repositorio.ListarAsync(Arg.Any<CancellationToken>()).Returns(transacoes);
        var tempo = new FakeTimeProvider();
        var fechar = new FecharMes(repositorio, new RegistroFalso(), new GerarRelatorio(Substitute.For<IGeradorDeRelatorio>(), tempo),
            Substitute.For<INotificador>(), tempo);
        return new ConsultarHistorico(repositorio, fechar);
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
    public async Task Sem_transacoes_o_historico_fica_vazio()
    {
        var historico = await Montar([]).ExecutarAsync();

        historico.Meses.Should().BeEmpty();
        historico.Painel.Should().BeNull();
        historico.Transacoes.Should().BeEmpty();
    }
}

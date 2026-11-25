using FluentAssertions;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;

namespace HdsFinance.Application.Tests.Relatorios;

public class GerarRelatorioTestes
{
    private static readonly byte[] Pdf = [0x25, 0x50, 0x44, 0x46];

    private static ResumoMensal Mes(int ano, int mes) => new(new MesDeReferencia(ano, mes), 100m, 10m, 5m, 0m);

    private static (GerarRelatorio CasoDeUso, IGeradorDeRelatorio Gerador) Montar()
    {
        var gerador = Substitute.For<IGeradorDeRelatorio>();
        gerador.Gerar(Arg.Any<Relatorio>()).Returns(Pdf);
        var tempo = new FakeTimeProvider(new DateTimeOffset(2026, 11, 9, 10, 0, 0, TimeSpan.Zero));
        return (new GerarRelatorio(gerador, tempo), gerador);
    }

    [Fact]
    public void Sem_mes_escolhido_usa_o_mais_recente()
    {
        var (gerar, gerador) = Montar();

        var resultado = gerar.Executar([Mes(2026, 9), Mes(2026, 10)]);

        resultado.Should().Be(new ResultadoDoRelatorio.Gerado(Pdf, new MesDeReferencia(2026, 10)));
        gerador.Received().Gerar(Arg.Is<Relatorio>(r => r.Mes.Mes == new MesDeReferencia(2026, 10)));
    }

    [Fact]
    public void Leva_no_maximo_doze_meses_de_historico_ate_o_mes_escolhido()
    {
        var (gerar, gerador) = Montar();
        var meses = Enumerable.Range(0, 15).Select(i => Mes(2025 + (i + 6) / 12, (i + 6) % 12 + 1)).ToList();

        gerar.Executar(meses, new MesDeReferencia(2026, 7));

        gerador.Received().Gerar(Arg.Is<Relatorio>(r =>
            r.Historico.Count == 12
            && r.Historico[0].Mes == new MesDeReferencia(2025, 8)
            && r.Historico[11].Mes == new MesDeReferencia(2026, 7)));
    }

    [Fact]
    public void Compara_so_com_o_mes_imediatamente_anterior()
    {
        var outubro = Mes(2026, 10);
        var hoje = new DateOnly(2026, 11, 9);

        new Relatorio(outubro, [Mes(2026, 9), outubro], hoje).Anterior.Should().Be(Mes(2026, 9));
        new Relatorio(outubro, [Mes(2026, 8), outubro], hoje).Anterior.Should().BeNull();
        new Relatorio(Mes(2026, 1), [Mes(2025, 12), Mes(2026, 1)], hoje).Anterior!.Mes.Should().Be(new MesDeReferencia(2025, 12));
    }

    [Theory]
    [InlineData(150, 100, 0.5)]
    [InlineData(50, 100, -0.5)]
    [InlineData(50, -100, 1.5)]
    public void Variacao_e_sobre_o_valor_anterior(int atual, int anterior, double esperada)
    {
        Relatorio.Variacao(atual, anterior).Should().Be((decimal)esperada);
    }

    [Fact]
    public void Sem_valor_anterior_nao_ha_variacao()
    {
        Relatorio.Variacao(10m, null).Should().BeNull();
        Relatorio.Variacao(10m, 0m).Should().BeNull();
    }

    [Fact]
    public void Registra_a_data_de_geracao_pelo_relogio()
    {
        var (gerar, gerador) = Montar();

        gerar.Executar([Mes(2026, 10)]);

        gerador.Received().Gerar(Arg.Is<Relatorio>(r => r.GeradoEm == new DateOnly(2026, 11, 9)));
    }

    [Fact]
    public void Mes_sem_dados_nao_gera_relatorio()
    {
        var (gerar, gerador) = Montar();

        var resultado = gerar.Executar([Mes(2026, 10)], new MesDeReferencia(2026, 3));

        resultado.Should().Be(new ResultadoDoRelatorio.MesSemDados(new MesDeReferencia(2026, 3)));
        gerador.DidNotReceiveWithAnyArgs().Gerar(default!);
    }

    [Fact]
    public void Sem_nenhum_mes_nao_gera_relatorio()
    {
        var (gerar, _) = Montar();

        gerar.Executar([]).Should().BeOfType<ResultadoDoRelatorio.MesSemDados>();
    }
}

using FluentAssertions;
using HdsFinance.Domain;

namespace HdsFinance.Domain.Tests;

public class ResumoMensalTestes
{
    private static readonly MesDeReferencia Outubro = new(2026, 10);

    private static Transacao Nova(decimal valor, TipoDeTransacao tipo = TipoDeTransacao.Comum) =>
        new(new DateOnly(2026, 10, 5), valor, "Descrição fictícia", tipo);

    [Fact]
    public void Separa_entradas_e_saidas()
    {
        var resumo = ResumoMensal.Calcular(Outubro, 100m, [Nova(1000m), Nova(-250m), Nova(-50m)]);

        resumo.Entradas.Should().Be(1000m);
        resumo.Saidas.Should().Be(300m);
    }

    [Fact]
    public void Fecha_saldo_inicial_mais_entradas_menos_saidas_igual_saldo_final()
    {
        var resumo = ResumoMensal.Calcular(Outubro, 100m, [Nova(1000m), Nova(-250m)]);

        resumo.SaldoFinal.Should().Be(resumo.SaldoInicial + resumo.Entradas - resumo.Saidas);
        resumo.SaldoFinal.Should().Be(850m);
    }

    [Theory]
    [InlineData(TipoDeTransacao.TransferenciaEntreContasProprias)]
    [InlineData(TipoDeTransacao.MovimentacaoDeInvestimento)]
    public void Transferencias_e_investimentos_nao_contam_como_receita_nem_despesa(TipoDeTransacao tipo)
    {
        var resumo = ResumoMensal.Calcular(Outubro, 0m, [Nova(500m, tipo), Nova(-200m, tipo)]);

        resumo.Entradas.Should().Be(0m);
        resumo.Saidas.Should().Be(0m);
    }

    [Fact]
    public void Ignora_transacoes_de_outros_meses()
    {
        var setembro = new Transacao(new DateOnly(2026, 9, 30), 999m, "Descrição fictícia", TipoDeTransacao.Comum);

        var resumo = ResumoMensal.Calcular(Outubro, 0m, [setembro, Nova(10m)]);

        resumo.Entradas.Should().Be(10m);
    }
}

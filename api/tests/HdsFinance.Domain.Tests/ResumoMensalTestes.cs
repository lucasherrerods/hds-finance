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

public class ResumoMensalPorMesTestes
{
    private static Transacao Em(int mes, int dia, decimal valor) =>
        new(new DateOnly(2026, mes, dia), valor, "Descrição fictícia", TipoDeTransacao.Comum);

    [Fact]
    public void Gera_um_resumo_por_mes_em_ordem_cronologica()
    {
        var resumos = ResumoMensal.PorMes([Em(10, 3, -20m), Em(9, 30, 100m), Em(10, 1, 50m)]);

        resumos.Select(r => r.Mes).Should().Equal(new MesDeReferencia(2026, 9), new MesDeReferencia(2026, 10));
        resumos[1].Entradas.Should().Be(50m);
        resumos[1].Saidas.Should().Be(20m);
    }

    [Fact]
    public void Resultado_e_entradas_menos_saidas()
    {
        var resumo = ResumoMensal.PorMes([Em(10, 1, 50m), Em(10, 2, -20m)]).Single();

        resumo.Resultado.Should().Be(30m);
    }

    [Fact]
    public void Sem_transacoes_nao_ha_resumo()
    {
        ResumoMensal.PorMes([]).Should().BeEmpty();
    }
}

public class ResumoMensalSaldoTestes
{
    private static Transacao Em(int mes, int dia, decimal valor, TipoDeTransacao tipo = TipoDeTransacao.Comum) =>
        new(new DateOnly(2026, mes, dia), valor, "Descrição fictícia", tipo);

    [Fact]
    public void Fecha_com_investimentos_e_transferencias()
    {
        var resumo = ResumoMensal.Calcular(new MesDeReferencia(2026, 10), 100m,
            [Em(10, 1, 3500m), Em(10, 5, -123.45m), Em(10, 10, -1000m, TipoDeTransacao.MovimentacaoDeInvestimento)]);

        resumo.InvestimentosETransferencias.Should().Be(-1000m);
        resumo.SaldoFinal.Should().Be(
            resumo.SaldoInicial + resumo.Entradas - resumo.Saidas + resumo.InvestimentosETransferencias);
        resumo.SaldoFinal.Should().Be(2476.55m);
    }

    [Fact]
    public void Deduz_o_saldo_inicial_de_cada_mes_a_partir_do_saldo_final_do_extrato()
    {
        var resumos = ResumoMensal.PorMes(
            [Em(9, 20, 1000m), Em(10, 1, 3500m), Em(10, 10, -1000m, TipoDeTransacao.MovimentacaoDeInvestimento)],
            saldoFinalDoExtrato: 4000m);

        resumos[0].SaldoInicial.Should().Be(500m);
        resumos[0].SaldoFinal.Should().Be(1500m);
        resumos[1].SaldoInicial.Should().Be(1500m);
        resumos[1].SaldoFinal.Should().Be(4000m);
    }

    [Fact]
    public void Sem_saldo_no_extrato_o_saldo_fica_desconhecido()
    {
        var resumo = ResumoMensal.PorMes([Em(10, 1, 50m)]).Single();

        resumo.SaldoInicial.Should().BeNull();
        resumo.SaldoFinal.Should().BeNull();
        resumo.Resultado.Should().Be(50m);
    }
}

public class ResumoMensalCategoriasTestes
{
    private static Transacao Em(decimal valor, string descricao, TipoDeTransacao tipo = TipoDeTransacao.Comum) =>
        new(new DateOnly(2026, 10, 5), valor, descricao, tipo);

    private static readonly Categorizador Categorizador = new(
    [
        new RegraDeCategoria("Alimentação", ["mercado", "padaria"]),
        new RegraDeCategoria("Transporte", ["uber"]),
    ]);

    [Fact]
    public void Soma_as_despesas_por_categoria_da_maior_para_a_menor()
    {
        var resumo = ResumoMensal.Calcular(new MesDeReferencia(2026, 10), 0m,
            [Em(-30m, "Uber"), Em(-100m, "Mercado"), Em(-20m, "Padaria"), Em(-5m, "Livraria"), Em(3000m, "Salario")],
            Categorizador);

        resumo.GastosPorCategoria.Should().Equal(
            new GastoPorCategoria("Alimentação", 120m),
            new GastoPorCategoria("Transporte", 30m),
            new GastoPorCategoria(Categorizador.SemCategoria, 5m));
    }

    [Fact]
    public void Investimentos_e_transferencias_nao_entram_nos_gastos()
    {
        var resumo = ResumoMensal.Calcular(new MesDeReferencia(2026, 10), 0m,
            [Em(-1000m, "Aplicacao mercado", TipoDeTransacao.MovimentacaoDeInvestimento)], Categorizador);

        resumo.GastosPorCategoria.Should().BeEmpty();
    }

    [Fact]
    public void Os_gastos_por_categoria_somam_as_saidas()
    {
        var resumo = ResumoMensal.PorMes([Em(-30m, "Uber"), Em(-100m, "Mercado"), Em(-7m, "Outro")], categorizador: Categorizador).Single();

        resumo.GastosPorCategoria.Sum(g => g.Valor).Should().Be(resumo.Saidas);
    }
}

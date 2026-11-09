using FluentAssertions;

namespace HdsFinance.Domain.Tests;

public class PainelDoMesTestes
{
    private static readonly Categorizador Categorizador = new(
    [
        new RegraDeCategoria("Alimentação", ["mercado", "ifood"]),
        new RegraDeCategoria("Transporte", ["uber"]),
    ]);

    private static Transacao Em(int mes, int dia, decimal valor, string descricao = "Mercado", TipoDeTransacao tipo = TipoDeTransacao.Comum) =>
        new(new DateOnly(2026, mes, dia), valor, descricao, tipo);

    private static PainelDoMes Montar(params Transacao[] transacoes) => PainelDoMes.Montar(transacoes, Categorizador)!;

    [Fact]
    public void Sem_despesas_nem_transacoes_nao_ha_painel()
    {
        PainelDoMes.Montar([], Categorizador).Should().BeNull();
    }

    [Fact]
    public void Usa_o_ultimo_mes_do_extrato_e_compara_com_o_anterior()
    {
        var painel = Montar(Em(10, 3, -100m), Em(11, 2, -150m), Em(11, 4, 3000m, "Salario"));

        painel.Mes.Should().Be(new MesDeReferencia(2026, 11));
        painel.GastoNoMes.Should().Be(150m);
        painel.GastoNoMesAnterior.Should().Be(100m);
        painel.VariacaoPercentual.Should().Be(50m);
    }

    [Fact]
    public void Sem_mes_anterior_no_extrato_nao_ha_comparacao()
    {
        var painel = Montar(Em(11, 2, -150m));

        painel.GastoNoMesAnterior.Should().BeNull();
        painel.VariacaoPercentual.Should().BeNull();
    }

    [Fact]
    public void Investimentos_e_transferencias_nao_contam_como_gasto()
    {
        var painel = Montar(Em(11, 2, -150m), Em(11, 3, -1000m, "Aplicacao", TipoDeTransacao.MovimentacaoDeInvestimento));

        painel.GastoNoMes.Should().Be(150m);
    }

    [Fact]
    public void O_ritmo_acumula_o_gasto_dia_a_dia_ate_o_ultimo_dia_com_movimento()
    {
        var painel = Montar(Em(10, 1, -50m), Em(10, 30, -50m), Em(11, 1, -10m), Em(11, 3, -20m));

        painel.Ritmo.Should().HaveCount(30);
        painel.Ritmo[0].Should().Be(new PontoDoRitmo(1, 10m, 50m));
        painel.Ritmo[1].Should().Be(new PontoDoRitmo(2, 10m, 50m));
        painel.Ritmo[2].Should().Be(new PontoDoRitmo(3, 30m, 50m));
        painel.Ritmo[3].AcumuladoAtual.Should().BeNull();
        painel.Ritmo[29].Should().Be(new PontoDoRitmo(30, null, 100m));
    }

    [Fact]
    public void O_mapa_de_calor_tem_cada_dia_com_dia_da_semana_semana_e_gasto()
    {
        // 1º de novembro de 2026 é um domingo.
        var painel = Montar(Em(11, 1, -40m), Em(11, 1, -10m), Em(11, 9, -30m));

        painel.MapaDeCalor.Should().HaveCount(30);
        painel.MapaDeCalor[0].Should().Be(new GastoDoDia(1, DayOfWeek.Sunday, 0, 50m));
        painel.MapaDeCalor[8].Should().Be(new GastoDoDia(9, DayOfWeek.Monday, 1, 30m));
        painel.MapaDeCalor.Sum(d => d.Valor).Should().Be(painel.GastoNoMes);
    }

    [Fact]
    public void Media_diaria_e_maior_gasto_consideram_os_dias_ate_o_ultimo_movimento()
    {
        var painel = Montar(Em(11, 1, -40m), Em(11, 4, -80m));

        painel.MediaDiaria.Should().Be(30m);
        painel.MaiorGasto.Should().Be(new GastoDoDia(4, DayOfWeek.Wednesday, 0, 80m));
    }

    [Fact]
    public void Principais_categorias_comparam_com_o_mes_anterior()
    {
        var painel = Montar(
            Em(10, 5, -100m, "Mercado"), Em(10, 6, -40m, "Uber"),
            Em(11, 5, -150m, "Mercado"), Em(11, 6, -20m, "Uber"), Em(11, 7, -5m, "Livraria"));

        painel.PrincipaisCategorias.Should().Equal(
            new CategoriaComparada("Alimentação", 150m, 100m, 50m),
            new CategoriaComparada("Transporte", 20m, 40m, -50m),
            new CategoriaComparada(Categorizador.SemCategoria, 5m, 0m, null));
    }

    [Fact]
    public void Mostra_no_maximo_cinco_categorias()
    {
        var categorizador = new Categorizador(Enumerable.Range(1, 7).Select(i => new RegraDeCategoria($"C{i}", [$"palavra{i}"])));
        var transacoes = Enumerable.Range(1, 7).Select(i => Em(11, i, -i, $"palavra{i}"));

        PainelDoMes.Montar(transacoes, categorizador)!.PrincipaisCategorias.Should().HaveCount(5);
    }

    [Fact]
    public void Transacoes_recentes_vem_da_mais_nova_para_a_mais_antiga_com_categoria()
    {
        var painel = Montar(
            Em(11, 1, 3000m, "Salario"),
            Em(11, 2, -1000m, "Aplicacao", TipoDeTransacao.MovimentacaoDeInvestimento),
            Em(11, 3, -30m, "Uber"));

        painel.TransacoesRecentes.Select(t => (t.Data.Day, t.Categoria)).Should().Equal(
            (3, "Transporte"),
            (2, TransacaoCategorizada.CategoriaDeMovimentacaoInterna),
            (1, TransacaoCategorizada.CategoriaDeEntrada));
    }

    [Fact]
    public void Mostra_no_maximo_dez_transacoes_recentes()
    {
        var painel = Montar(Enumerable.Range(1, 15).Select(d => Em(11, d, -1m)).ToArray());

        painel.TransacoesRecentes.Should().HaveCount(10);
        painel.TransacoesRecentes[0].Data.Day.Should().Be(15);
    }
}

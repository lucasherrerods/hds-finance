using FluentAssertions;

namespace HdsFinance.Domain.Tests;

public class TransacaoCategorizadaTestes
{
    private static readonly Categorizador Categorizador = new([new RegraDeCategoria("Transporte", ["uber"])]);

    private static Transacao Em(int dia, decimal valor, string descricao, TipoDeTransacao tipo = TipoDeTransacao.Comum) =>
        new(new DateOnly(2026, 11, dia), valor, descricao, tipo);

    [Fact]
    public void Despesas_recebem_a_categoria_das_regras()
    {
        TransacaoCategorizada.De(Em(3, -30m, "Uber"), Categorizador).Categoria.Should().Be("Transporte");
    }

    [Fact]
    public void Entradas_e_movimentacoes_internas_tem_categoria_propria()
    {
        TransacaoCategorizada.De(Em(1, 3000m, "Uber reembolso"), Categorizador).Categoria
            .Should().Be(TransacaoCategorizada.CategoriaDeEntrada);
        TransacaoCategorizada.De(Em(2, -1000m, "Aplicacao", TipoDeTransacao.MovimentacaoDeInvestimento), Categorizador).Categoria
            .Should().Be(TransacaoCategorizada.CategoriaDeMovimentacaoInterna);
    }

    [Fact]
    public void A_lista_vem_da_mais_nova_para_a_mais_antiga_mantendo_a_ordem_do_arquivo_no_mesmo_dia()
    {
        var lista = TransacaoCategorizada.Listar([Em(1, -1m, "A"), Em(3, -1m, "B"), Em(3, -1m, "C"), Em(2, -1m, "D")], Categorizador);

        lista.Select(t => t.Descricao).Should().Equal("B", "C", "D", "A");
    }
}

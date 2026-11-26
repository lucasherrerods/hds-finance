using FluentAssertions;

namespace HdsFinance.Domain.Tests;

public class EmprestimoTestes
{
    private static Transacao Em(decimal valor, string descricao, string? categoria = null) =>
        new(new DateOnly(2026, 10, 5), valor, descricao, TipoDeTransacao.Comum) { Categoria = categoria };

    private static ResumoMensal Resumir(params Transacao[] transacoes) =>
        ResumoMensal.Calcular(new MesDeReferencia(2026, 10), 100m, transacoes);

    [Theory]
    [InlineData("Empréstimo pessoal liberado")]
    [InlineData("Crédito Consignado")]
    [InlineData("Antecipação do FGTS")]
    [InlineData("SAQUE-ANIVERSARIO")]
    public void Emprestimo_recebido_nao_e_receita_e_o_saldo_fecha(string descricao)
    {
        var mes = Resumir(Em(3500m, "Salario"), Em(5000m, descricao), Em(-200m, "Mercado"));

        mes.Entradas.Should().Be(3500m);
        mes.Emprestimos.Should().Be(5000m);
        mes.InvestimentosETransferencias.Should().Be(0m);
        mes.SaldoFinal.Should().Be(100m + 3500m + 5000m - 200m);
    }

    [Fact]
    public void A_parcela_paga_e_gasto_em_emprestimos()
    {
        var mes = Resumir(Em(-300m, "Parcela emprestimo"));

        mes.Saidas.Should().Be(300m);
        mes.Emprestimos.Should().Be(0m);
        mes.GastosPorCategoria.Should().Equal(new GastoPorCategoria(Emprestimo.Categoria, 300m));
    }

    [Fact]
    public void A_pessoa_marca_um_pix_comum_como_emprestimo()
    {
        var mes = Resumir(Em(1000m, "Pix recebido Fulano", Emprestimo.Categoria));

        mes.Entradas.Should().Be(0m);
        mes.Emprestimos.Should().Be(1000m);
    }

    [Fact]
    public void A_pessoa_diz_que_e_receita_e_vence_a_descricao()
    {
        var transacao = Em(1000m, "Emprestimo devolvido", TransacaoCategorizada.CategoriaDeEntrada);

        Resumir(transacao).Entradas.Should().Be(1000m);
        TransacaoCategorizada.De(transacao, Categorizador.Padrao).Categoria.Should().Be(TransacaoCategorizada.CategoriaDeEntrada);
    }

    [Fact]
    public void Emprestimo_oculto_sai_da_soma_e_o_saldo_fecha()
    {
        var mes = Resumir(Em(1000m, "Emprestimo") with { Oculta = true });

        mes.Emprestimos.Should().Be(0m);
        mes.SaldoFinal.Should().Be(1100m);
    }

    [Fact]
    public void Emprestimo_de_outro_banco_nao_mexe_no_saldo_do_inter()
    {
        var mes = Resumir(Em(1000m, "Emprestimo") with { Banco = Banco.Nubank });

        mes.Emprestimos.Should().Be(1000m);
        mes.SaldoFinal.Should().Be(100m);
    }

    [Fact]
    public void Na_lista_aparece_como_emprestimo()
    {
        TransacaoCategorizada.De(Em(1000m, "Emprestimo"), Categorizador.Padrao).Categoria.Should().Be(Emprestimo.Categoria);
    }

    [Fact]
    public void Gasto_marcado_como_entrada_segue_as_regras()
    {
        Categorizador.Padrao.Categorizar(Em(-50m, "Mercado", TransacaoCategorizada.CategoriaDeEntrada)).Should().Be("Supermercado");
    }
}

using FluentAssertions;
using HdsFinance.Domain;

namespace HdsFinance.Domain.Tests;

public class TransacaoAjustadaTestes
{
    private static readonly Transacao Salario = new(new DateOnly(2026, 10, 1), 1000m, "Salario", TipoDeTransacao.Comum);
    private static readonly Transacao Mercado = new(new DateOnly(2026, 10, 5), -100m, "Mercado", TipoDeTransacao.Comum);
    private static readonly Transacao Oculta = new(new DateOnly(2026, 10, 6), -300m, "Emprestimo a um amigo", TipoDeTransacao.Comum) { Oculta = true };

    [Fact]
    public void A_oculta_sai_das_somas_mas_o_saldo_continua_fechando()
    {
        var mes = ResumoMensal.PorMes([Salario, Mercado, Oculta], 600m).Single();

        mes.Entradas.Should().Be(1000m);
        mes.Saidas.Should().Be(100m);
        mes.InvestimentosETransferencias.Should().Be(0m);
        mes.GastosPorCategoria.Sum(g => g.Valor).Should().Be(100m);
        mes.SaldoInicial.Should().Be(0m);
        mes.SaldoFinal.Should().Be(600m);
    }

    [Fact]
    public void Entrada_aplicacao_e_compra_no_cartao_ocultas_tambem_saem()
    {
        var entrada = Salario with { Oculta = true };
        var aplicacao = new Transacao(new DateOnly(2026, 10, 7), -50m, "CDB", TipoDeTransacao.MovimentacaoDeInvestimento) { Oculta = true };
        var cartao = new Transacao(new DateOnly(2026, 10, 8), -70m, "Loja", TipoDeTransacao.CompraNoCartao) { Oculta = true };

        var mes = ResumoMensal.PorMes([entrada, aplicacao, cartao], 950m).Single();

        mes.Entradas.Should().Be(0m);
        mes.Saidas.Should().Be(0m);
        mes.Investimentos.Aplicado.Should().Be(0m);
        mes.ComprasNoCartao.Should().Be(0m);
        mes.SaldoInicial.Should().Be(0m);
        mes.SaldoFinal.Should().Be(950m);
    }

    [Fact]
    public void A_oculta_sai_do_painel_mas_continua_na_lista()
    {
        var painel = PainelDoMes.Montar([Mercado, Oculta], Categorizador.Padrao)!;

        painel.GastoNoMes.Should().Be(100m);
        painel.TransacoesRecentes.Should().ContainSingle().Which.Descricao.Should().Be("Mercado");
        TransacaoCategorizada.Listar([Mercado, Oculta], Categorizador.Padrao).Should().HaveCount(2)
            .And.ContainSingle(t => t.Oculta && t.Categoria == Categorizador.SemCategoria);
    }

    [Fact]
    public void A_categoria_da_transacao_vence_as_regras_e_as_aprendidas()
    {
        var categorizador = Categorizador.Padrao.ComAprendidas([new CategoriaAprendida("Mercado", "Lazer")]);

        categorizador.Categorizar(Mercado).Should().Be("Lazer");
        categorizador.Categorizar(Mercado with { Categoria = "Moradia" }).Should().Be("Moradia");
    }

    [Fact]
    public void Entrada_mostra_a_categoria_escolhida_sem_virar_gasto()
    {
        var entrada = Salario with { Categoria = "Moradia" };

        TransacaoCategorizada.De(entrada, Categorizador.Padrao).Categoria.Should().Be("Moradia");
        ResumoMensal.PorMes([entrada]).Single().Entradas.Should().Be(1000m);
    }

    [Fact]
    public void O_pagamento_de_fatura_oculto_continua_reconhecido()
    {
        var fatura = new Fatura(new DateOnly(2026, 11, 2), 10m, 0m, 0m, 10m,
            [new CartaoDaFatura(10m, [new LinhaDaFatura(new DateOnly(2026, 10, 5), "LANCHE", -10m)])]);
        var pagamento = new Transacao(new DateOnly(2026, 11, 2), -10m, "Fatura", TipoDeTransacao.Comum) { Oculta = true };

        ResumoMensal.PorMes(ConciliacaoDaFatura.Aplicar([pagamento, .. fatura.ParaTransacoes()]), 0m)[^1].SaldoFinal.Should().Be(0m);
    }
}

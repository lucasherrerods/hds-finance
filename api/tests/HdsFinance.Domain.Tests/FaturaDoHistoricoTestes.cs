using FluentAssertions;
using HdsFinance.Domain;

namespace HdsFinance.Domain.Tests;

public class FaturaDoHistoricoTestes
{
    private static Fatura Montar(DateOnly vencimento, decimal total, params LinhaDaFatura[] extras) => new(vencimento, total, 0m, 0m, total,
        [new CartaoDaFatura(total, [new LinhaDaFatura(vencimento.AddDays(-20), "LOJA", -total), .. extras])]);

    private static readonly Fatura Outubro = Montar(new DateOnly(2026, 10, 2), 100m);
    private static readonly Fatura Novembro = Montar(new DateOnly(2026, 11, 2), 50m, new LinhaDaFatura(new DateOnly(2026, 10, 3), "PAGTO", 60m));

    private static IReadOnlyList<FaturaDoHistorico> Listar(params IEnumerable<Transacao> transacoes) =>
        FaturaDoHistorico.Listar(transacoes, Categorizador.Padrao);

    [Fact]
    public void Agrupa_as_compras_por_fatura_da_mais_nova_para_a_mais_antiga()
    {
        var faturas = Listar([.. Outubro.ParaTransacoes(), .. Novembro.ParaTransacoes()]);

        faturas.Select(f => (f.Vencimento, f.Total, f.Gasto)).Should().Equal(
            (new DateOnly(2026, 11, 2), 50m, 50m), (new DateOnly(2026, 10, 2), 100m, 100m));
        faturas[0].Compras.Should().ContainSingle().Which.Descricao.Should().Be("LOJA");
    }

    [Fact]
    public void Fica_paga_quando_o_pagamento_esta_no_extrato()
    {
        var pagamento = new Transacao(new DateOnly(2026, 10, 2), -100m, "Fatura", TipoDeTransacao.Comum);

        Listar([pagamento, .. Outubro.ParaTransacoes()]).Single().Paga.Should().BeTrue();
        Listar(Outubro.ParaTransacoes()).Single().Paga.Should().BeFalse();
    }

    [Fact]
    public void Paga_em_partes_e_reconhecida_pela_fatura_seguinte()
    {
        var seguinte = Montar(new DateOnly(2026, 11, 2), 50m,
            new LinhaDaFatura(new DateOnly(2026, 10, 2), "PAGTO", 60m), new LinhaDaFatura(new DateOnly(2026, 10, 5), "PAGTO", 40m));
        Transacao Pago(int dia, decimal valor) => new(new DateOnly(2026, 10, dia), -valor, "Pix", TipoDeTransacao.Comum);

        Listar([Pago(2, 60m), Pago(5, 40m), .. Outubro.ParaTransacoes(), .. seguinte.ParaTransacoes()])[1].Paga.Should().BeTrue();
        Listar([Pago(2, 60m), .. Outubro.ParaTransacoes(), .. seguinte.ParaTransacoes()])[1].Paga.Should().BeFalse();
    }

    [Fact]
    public void Compra_oculta_aparece_mas_nao_soma()
    {
        var transacoes = Outubro.ParaTransacoes().Select(t => t with { Oculta = t.Tipo == TipoDeTransacao.CompraNoCartao });

        var fatura = Listar(transacoes).Single();

        fatura.Gasto.Should().Be(0m);
        fatura.Compras.Should().ContainSingle().Which.Oculta.Should().BeTrue();
    }

    [Fact]
    public void Sem_fatura_a_lista_e_vazia()
    {
        Listar([new Transacao(new DateOnly(2026, 10, 2), -1m, "Loja", TipoDeTransacao.Comum)]).Should().BeEmpty();
    }

    [Theory]
    [InlineData("LOJA (Parcela 03 de 12)")]
    [InlineData("LOJA (Parcela 03/12)")]
    public void Parcela_vale_nos_dois_jeitos_de_escrever(string descricao)
    {
        var fatura = new Fatura(new DateOnly(2026, 11, 2), 10m, 0m, 0m, 10m,
            [new CartaoDaFatura(10m, [new LinhaDaFatura(new DateOnly(2026, 7, 9), descricao, -10m)])]);

        fatura.ParaTransacoes()[0].Data.Should().Be(new DateOnly(2026, 9, 9));
    }
}

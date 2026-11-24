using FluentAssertions;
using HdsFinance.Domain;

namespace HdsFinance.Domain.Tests;

public class FaturaTestes
{
    private static readonly DateOnly Vencimento = new(2026, 11, 2);

    private static Fatura Exemplo() => new(Vencimento, Despesas: 100m, Juros: 0m, Antecipado: 50m, Total: 50m, [
        new CartaoDaFatura(100m, [
            new LinhaDaFatura(new DateOnly(2026, 7, 9), "LOJA (Parcela 03 de 12)", -30m),
            new LinhaDaFatura(new DateOnly(2026, 9, 13), "LANCHE", -70m),
            new LinhaDaFatura(new DateOnly(2026, 9, 15), "PAGTO DEBITO AUTOMATICO", 200m),
            new LinhaDaFatura(new DateOnly(2026, 9, 20), "LOJA ESTORNO", 10m),
            new LinhaDaFatura(new DateOnly(2026, 10, 1), "PAGAMENTO ON LINE", 40m),
        ]),
    ]);

    private static List<Transacao> Compras(Fatura fatura) =>
        fatura.ParaTransacoes().Where(t => t.Tipo == TipoDeTransacao.CompraNoCartao).ToList();

    [Fact]
    public void Compra_fica_no_dia_dela_e_a_parcela_no_mes_em_que_foi_cobrada()
    {
        Compras(Exemplo()).Select(t => (t.Data, t.Valor)).Should().Equal(
            (new DateOnly(2026, 9, 9), -30m), (new DateOnly(2026, 9, 13), -70m), (new DateOnly(2026, 9, 20), 10m));
    }

    [Fact]
    public void Compras_iguais_no_mesmo_dia_nao_viram_duplicata_e_reimportar_da_a_mesma_chave()
    {
        var dia = new DateOnly(2026, 9, 13);
        var fatura = new Fatura(Vencimento, 20m, 0m, 0m, 20m,
            [new CartaoDaFatura(20m, [new LinhaDaFatura(dia, "UBER", -10m), new LinhaDaFatura(dia, "UBER", -10m)])]);

        var chaves = Compras(fatura).Select(t => t.ChaveDeDeduplicacao).ToList();

        chaves.Should().OnlyHaveUniqueItems();
        Compras(fatura).Select(t => t.ChaveDeDeduplicacao).Should().Equal(chaves);
    }

    [Fact]
    public void Confere_quando_os_numeros_fecham()
    {
        Exemplo().Confere().Should().BeTrue();
    }

    [Fact]
    public void Nao_confere_se_faltar_uma_compra()
    {
        var fatura = Exemplo();
        var cartao = fatura.Cartoes[0];

        (fatura with { Cartoes = [cartao with { Linhas = cartao.Linhas.Skip(1).ToList() }] }).Confere().Should().BeFalse();
    }

    [Fact]
    public void Nao_confere_se_o_antecipado_nao_bate_com_os_creditos()
    {
        (Exemplo() with { Antecipado = 45m, Total = 55m }).Confere().Should().BeFalse();
    }

    [Fact]
    public void Juros_fora_das_compras_viram_um_gasto_no_vencimento()
    {
        var fatura = Exemplo() with { Juros = 5m, Total = 55m };

        fatura.Confere().Should().BeTrue();
        Compras(fatura).Should().Contain(t => t.Data == Vencimento && t.Valor == -5m);
    }

    [Fact]
    public void Juros_ja_incluidos_nas_despesas_nao_contam_de_novo()
    {
        var fatura = Exemplo() with { Juros = 5m };

        fatura.Confere().Should().BeTrue();
        Compras(fatura).Should().HaveCount(3);
    }

    [Fact]
    public void O_pagamento_da_fatura_incluida_deixa_de_ser_gasto()
    {
        var pagamento = new Transacao(new DateOnly(2026, 11, 2), -50m, "Fatura", TipoDeTransacao.Comum);
        var antecipado = new Transacao(new DateOnly(2026, 10, 1), -40m, "Cartao", TipoDeTransacao.Comum);
        var outro = new Transacao(new DateOnly(2026, 11, 2), -51m, "Mercado", TipoDeTransacao.Comum);

        var todas = ConciliacaoDaFatura.Aplicar([pagamento, antecipado, outro, .. Exemplo().ParaTransacoes()]);

        todas.Where(t => t.Tipo == TipoDeTransacao.PagamentoDeFatura).Select(t => t.Valor).Should().BeEquivalentTo([-50m, -40m]);
        todas.Should().Contain(outro);
        todas.Should().HaveCount(6, "as marcas de pagamento não aparecem");
    }

    [Fact]
    public void O_pagamento_da_fatura_anterior_que_nao_foi_incluida_continua_sendo_gasto()
    {
        var anterior = new Transacao(new DateOnly(2026, 9, 15), -200m, "Fatura", TipoDeTransacao.Comum);

        ConciliacaoDaFatura.Aplicar([anterior, .. Exemplo().ParaTransacoes()]).Should().Contain(anterior);
    }

    [Fact]
    public void Com_a_fatura_anterior_incluida_o_pagamento_parcial_dela_e_reconhecido()
    {
        var anterior = new Fatura(new DateOnly(2026, 10, 2), 300m, 0m, 0m, 300m,
            [new CartaoDaFatura(300m, [new LinhaDaFatura(new DateOnly(2026, 8, 20), "LOJA", -300m)])]);
        var parcial = new Transacao(new DateOnly(2026, 9, 15), -200m, "Fatura", TipoDeTransacao.Comum);

        ConciliacaoDaFatura.Aplicar([parcial, .. anterior.ParaTransacoes(), .. Exemplo().ParaTransacoes()])
            .Should().Contain(parcial with { Tipo = TipoDeTransacao.PagamentoDeFatura });
    }

    [Fact]
    public void Cada_marca_casa_com_um_pagamento_so_e_prefere_o_que_fala_de_fatura()
    {
        var pix = new Transacao(new DateOnly(2026, 11, 2), -50m, "Pix enviado", TipoDeTransacao.Comum);
        var fatura = new Transacao(new DateOnly(2026, 11, 1), -50m, "Pagamento fatura", TipoDeTransacao.Comum);

        var todas = ConciliacaoDaFatura.Aplicar([pix, fatura, .. Exemplo().ParaTransacoes()]);

        todas.Should().Contain(pix).And.Contain(fatura with { Tipo = TipoDeTransacao.PagamentoDeFatura });
    }

    [Fact]
    public void Se_as_compras_da_fatura_foram_apagadas_o_pagamento_volta_a_ser_gasto()
    {
        var pagamento = new Transacao(new DateOnly(2026, 11, 2), -50m, "Fatura", TipoDeTransacao.Comum);
        var soMarcas = Exemplo().ParaTransacoes().Where(t => t.Tipo == TipoDeTransacao.PagamentoDeFatura);

        ConciliacaoDaFatura.Aplicar([pagamento, .. soMarcas]).Should().Equal(pagamento);
    }

    [Fact]
    public void Compra_no_cartao_e_gasto_mas_o_saldo_so_muda_no_pagamento()
    {
        var conta = new Transacao(new DateOnly(2026, 11, 2), -50m, "Fatura", TipoDeTransacao.Comum);
        var salario = new Transacao(new DateOnly(2026, 9, 1), 1000m, "Salario", TipoDeTransacao.Comum);

        var meses = ResumoMensal.PorMes(ConciliacaoDaFatura.Aplicar([salario, conta, .. Exemplo().ParaTransacoes()]), 950m);

        meses[0].Saidas.Should().Be(90m, "o estorno abate o gasto e não vira receita");
        meses[0].Entradas.Should().Be(1000m);
        meses[0].SaldoInicial.Should().Be(0m);
        meses[0].SaldoFinal.Should().Be(1000m);
        meses[^1].Saidas.Should().Be(0m);
        meses[^1].SaldoFinal.Should().Be(950m);
    }

    [Fact]
    public void Estorno_do_cartao_abate_o_painel_e_nao_vira_entrada()
    {
        var painel = PainelDoMes.Montar(ConciliacaoDaFatura.Aplicar(Exemplo().ParaTransacoes()), Categorizador.Padrao)!;

        painel.GastoNoMes.Should().Be(90m);
        painel.MapaDeCalor.Should().OnlyContain(d => d.Valor >= 0);
        painel.TransacoesRecentes.Should().OnlyContain(t => t.NoCartao && t.Categoria != TransacaoCategorizada.CategoriaDeEntrada);
    }
}

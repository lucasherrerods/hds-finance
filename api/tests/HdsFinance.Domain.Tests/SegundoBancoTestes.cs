using FluentAssertions;
using HdsFinance.Domain;

namespace HdsFinance.Domain.Tests;

public class SegundoBancoTestes
{
    private static readonly DateOnly Dia = new(2023, 8, 5);
    private static readonly Transacao Inter = new(Dia, 100m, "Salario", TipoDeTransacao.Comum);
    private static Transacao Nu(decimal valor, string descricao, int dia = 5) =>
        new(new DateOnly(2023, 8, dia), valor, descricao, TipoDeTransacao.Comum) { Banco = Banco.Nubank };

    [Fact]
    public void Outro_banco_soma_nos_gastos_mas_o_saldo_e_so_do_inter()
    {
        var mes = ResumoMensal.PorMes([Inter, Nu(400m, "Deposito"), Nu(-30m, "Farmacia"), Nu(-50m, "Amigo") with { Oculta = true }], 100m).Single();

        mes.Entradas.Should().Be(500m);
        mes.Saidas.Should().Be(30m);
        mes.SaldoInicial.Should().Be(0m);
        mes.SaldoFinal.Should().Be(100m);
        SaldoDaConta.Calcular([Inter, Nu(400m, "Deposito")])!.Valor.Should().Be(100m);
    }

    [Fact]
    public void Dinheiro_entre_os_dois_bancos_nao_e_gasto_nem_receita()
    {
        var saiu = Nu(-25m, "Transferência enviada pelo Pix - EU - BANCO INTER (0077)");
        var entrou = new Transacao(Dia.AddDays(1), 25m, "Pix recebido", TipoDeTransacao.Comum);

        TransferenciasEntreBancos.Aplicar([saiu, entrou]).Should().OnlyContain(t => t.Tipo == TipoDeTransacao.TransferenciaEntreContasProprias);
    }

    [Fact]
    public void Do_inter_para_o_nubank_tambem()
    {
        var saiu = new Transacao(Dia, -25m, "Pix enviado NU PAGAMENTOS", TipoDeTransacao.Comum);

        TransferenciasEntreBancos.Aplicar([saiu, Nu(25m, "Transferência recebida pelo Pix")])
            .Should().OnlyContain(t => t.Tipo == TipoDeTransacao.TransferenciaEntreContasProprias);
    }

    [Theory]
    [InlineData(-25, "Transferência enviada pelo Pix - BCO BRADESCO", 25, 0)]
    [InlineData(-25, "BANCO INTER (0077)", 26, 0)]
    [InlineData(-25, "BANCO INTER (0077)", 25, 3)]
    public void Sem_o_banco_na_descricao_o_mesmo_valor_ou_data_proxima_nada_muda(decimal nubank, string descricao, decimal inter, int dias)
    {
        Transacao[] todas = [Nu(nubank, descricao), new(Dia.AddDays(dias), inter, "Pix recebido", TipoDeTransacao.Comum)];

        TransferenciasEntreBancos.Aplicar(todas).Should().Equal(todas);
    }

    [Fact]
    public void Cada_lado_casa_uma_vez_so()
    {
        Transacao[] todas = [Nu(-25m, "BANCO INTER"), Nu(-25m, "BANCO INTER"), new(Dia, 25m, "Pix recebido", TipoDeTransacao.Comum)];

        TransferenciasEntreBancos.Aplicar(todas).Count(t => t.Tipo == TipoDeTransacao.Comum).Should().Be(1);
    }

    private static Fatura Nubank(DateOnly vencimento, params (string Titulo, decimal Valor)[] linhas) =>
        Fatura.DoNubank(vencimento, linhas.Select(l => new LinhaDaFatura(vencimento.AddDays(-20), l.Titulo, l.Valor)).ToList());

    [Fact]
    public void Fatura_do_nubank_calcula_o_total_e_nao_se_mistura_com_a_do_inter()
    {
        var vencimento = new DateOnly(2024, 6, 22);
        var nubank = Nubank(vencimento, ("Uber", -13m), ("Loja", -50m), ("Estorno Loja", 10m), ("Pagamento recebido", 32m));
        var inter = new Fatura(vencimento, 80m, 0m, 0m, 80m, [new CartaoDaFatura(80m, [new LinhaDaFatura(vencimento.AddDays(-9), "Loja", -80m)])]);

        var faturas = FaturaDoHistorico.Listar([.. nubank.ParaTransacoes(), .. inter.ParaTransacoes()], Categorizador.Padrao);

        nubank.Confere().Should().BeTrue();
        faturas.Select(f => (f.Banco, f.Total, f.Compras.Count)).Should().BeEquivalentTo([(Banco.Nubank, (decimal?)53m, 3), (Banco.Inter, 80m, 1)]);
    }

    [Fact]
    public void Pagar_a_fatura_do_nubank_por_qualquer_conta_nao_e_gasto_de_novo()
    {
        var fatura = Nubank(new DateOnly(2024, 6, 22), ("Loja", -53m));
        var pelaContaNubank = Nu(-53m, "Pagamento de fatura") with { Data = new DateOnly(2024, 6, 20) };
        var pelaContaInter = pelaContaNubank with { Banco = Banco.Inter };

        ConciliacaoDaFatura.Aplicar([pelaContaNubank, .. fatura.ParaTransacoes()]).Should().Contain(t => t.Tipo == TipoDeTransacao.PagamentoDeFatura);
        ConciliacaoDaFatura.Aplicar([pelaContaInter, .. fatura.ParaTransacoes()]).Should().Contain(t => t.Tipo == TipoDeTransacao.PagamentoDeFatura);
    }

    [Fact]
    public void Parcela_do_nubank_com_a_data_da_compra_vai_para_o_mes_da_cobranca()
    {
        var vencimento = new DateOnly(2024, 6, 22);
        var fatura = Fatura.DoNubank(vencimento, [
            new LinhaDaFatura(new DateOnly(2024, 3, 10), "Loja - Parcela 3/6", -10m),
            new LinhaDaFatura(new DateOnly(2024, 5, 20), "Outra - Parcela 3/6", -10m)]);

        fatura.ParaTransacoes().Take(2).Select(t => t.Data).Should().Equal(new DateOnly(2024, 5, 10), new DateOnly(2024, 5, 20));
    }
}

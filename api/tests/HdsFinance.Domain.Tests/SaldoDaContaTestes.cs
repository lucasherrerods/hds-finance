using FluentAssertions;
using HdsFinance.Domain;

namespace HdsFinance.Domain.Tests;

public class SaldoDaContaTestes
{
    private static readonly Transacao Salario = new(new DateOnly(2026, 10, 1), 1000m, "Salario", TipoDeTransacao.Comum);
    private static readonly Transacao Oculta = new(new DateOnly(2026, 10, 5), -100m, "Amigo", TipoDeTransacao.Comum) { Oculta = true };
    private static readonly Transacao Aplicacao = new(new DateOnly(2026, 10, 6), -300m, "CDB", TipoDeTransacao.MovimentacaoDeInvestimento);
    private static readonly Transacao Cartao = new(new DateOnly(2026, 11, 20), -70m, "Loja", TipoDeTransacao.CompraNoCartao);

    [Fact]
    public void Sem_saldo_do_banco_soma_tudo_o_que_passou_pela_conta()
    {
        var saldo = SaldoDaConta.Calcular([Salario, Oculta, Aplicacao, Cartao])!;

        saldo.Should().Be(new SaldoDaConta(600m, new DateOnly(2026, 10, 6), Informado: false, AntesDoHistorico: null));
    }

    [Fact]
    public void O_saldo_informado_pelo_banco_vence_a_soma_e_mostra_o_que_havia_antes()
    {
        var saldo = SaldoDaConta.Calcular([Salario, Oculta, Aplicacao], 650m, new DateOnly(2026, 10, 31))!;

        saldo.Should().Be(new SaldoDaConta(650m, new DateOnly(2026, 10, 31), Informado: true, AntesDoHistorico: 50m));
    }

    [Fact]
    public void Movimento_depois_do_saldo_informado_entra_na_conta()
    {
        var depois = new Transacao(new DateOnly(2026, 11, 2), -40m, "Mercado", TipoDeTransacao.Comum);

        var saldo = SaldoDaConta.Calcular([Salario, depois], 1000m, new DateOnly(2026, 10, 31))!;

        saldo.Valor.Should().Be(960m);
        saldo.Em.Should().Be(new DateOnly(2026, 11, 2));
        saldo.AntesDoHistorico.Should().Be(0m);
    }

    [Fact]
    public void So_com_fatura_do_cartao_nao_ha_saldo_de_conta()
    {
        SaldoDaConta.Calcular([Cartao]).Should().BeNull();
        SaldoDaConta.Calcular([]).Should().BeNull();
    }
}

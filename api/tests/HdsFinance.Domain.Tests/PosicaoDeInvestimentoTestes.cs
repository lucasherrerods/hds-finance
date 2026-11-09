using FluentAssertions;
using HdsFinance.Domain;

namespace HdsFinance.Domain.Tests;

public class PosicaoDeInvestimentoTestes
{
    private static Transacao Investimento(int mes, int dia, decimal valor) =>
        new(new DateOnly(2026, mes, dia), valor, "CDB", TipoDeTransacao.MovimentacaoDeInvestimento);

    [Fact]
    public void Aplicacao_sai_da_conta_e_resgate_volta()
    {
        var mes = ResumoMensal.Calcular(new MesDeReferencia(2026, 10), 0m,
        [
            Investimento(10, 2, -1000m),
            Investimento(10, 9, -500m),
            Investimento(10, 20, 300m),
            new Transacao(new DateOnly(2026, 10, 5), -50m, "Transferência entre contas", TipoDeTransacao.TransferenciaEntreContasProprias),
        ]);

        mes.Investimentos.Should().Be(new PosicaoDeInvestimento(Aplicado: 1500m, Resgatado: 300m, AplicadoAcumulado: 1200m));
        mes.Investimentos.LiquidoNoMes.Should().Be(1200m);
    }

    [Fact]
    public void O_acumulado_soma_o_liquido_de_todos_os_meses_do_historico()
    {
        var meses = ResumoMensal.PorMes(
        [
            Investimento(8, 1, -1000m),
            Investimento(9, 1, -2000m),
            Investimento(10, 1, 1500m),
            new Transacao(new DateOnly(2026, 10, 3), 3000m, "Salário", TipoDeTransacao.Comum),
        ]);

        meses.Select(m => m.Investimentos.AplicadoAcumulado).Should().Equal(1000m, 3000m, 1500m);
    }

    [Fact]
    public void Mes_sem_investimento_fica_zerado()
    {
        var mes = ResumoMensal.Calcular(new MesDeReferencia(2026, 10), 0m, []);

        mes.Investimentos.Should().Be(new PosicaoDeInvestimento(0m, 0m, 0m));
    }
}

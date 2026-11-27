using FluentAssertions;

namespace HdsFinance.Domain.Tests;

public class ProjecaoDoMesTestes
{
    private static readonly DateOnly Dia10 = new(2026, 11, 10);

    [Fact]
    public void Projeta_o_ritmo_do_que_e_variavel_e_soma_as_recorrentes_que_faltam()
    {
        Transacao[] transacoes =
        [
            new(new DateOnly(2026, 11, 1), 4000m, "Salario", TipoDeTransacao.Comum),
            new(new DateOnly(2026, 11, 5), -100m, "Mercado", TipoDeTransacao.Comum),
            new(new DateOnly(2026, 11, 9), -12.90m, "EBN SPOTIFY", TipoDeTransacao.Comum),
            new(new DateOnly(2026, 11, 3), -2000m, "Aplicacao CDB", TipoDeTransacao.MovimentacaoDeInvestimento),
        ];
        Recorrente[] recorrentes =
        [
            new("EBN SPOTIFY", "Streaming de música", 12.90m, 9, SituacaoDaRecorrente.Paga, 12.90m),
            new("Pix enviado Fabio", "Sem categoria", 150m, 20, SituacaoDaRecorrente.Pendente, null),
        ];

        var projecao = ProjecaoDoMes.Calcular(transacoes, recorrentes, Dia10);

        // 100 variáveis em 10 dias = 10 por dia; faltam 20 dias. 112,90 + 200 + 150 pendentes.
        projecao.Should().Be(new ProjecaoDoMes(new MesDeReferencia(2026, 11), 10, 30, 112.90m, 462.90m, 150m, 4000m, 3537.10m));
    }

    [Fact]
    public void Sem_nada_no_mes_de_hoje_nao_ha_projecao()
    {
        Transacao[] doMesPassado = [new(new DateOnly(2026, 10, 5), -100m, "Mercado", TipoDeTransacao.Comum)];

        ProjecaoDoMes.Calcular(doMesPassado, [], Dia10).Should().BeNull();
    }
}

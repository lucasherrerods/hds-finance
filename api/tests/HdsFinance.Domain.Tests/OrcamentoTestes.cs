using FluentAssertions;

namespace HdsFinance.Domain.Tests;

public class OrcamentoTestes
{
    private static readonly MesDeReferencia Novembro = new(2026, 11);

    [Fact]
    public void Compara_o_gasto_do_mes_de_cada_grupo_com_o_limite()
    {
        Transacao[] transacoes =
        [
            new(new DateOnly(2026, 11, 2), -450m, "Supermercado Exemplo", TipoDeTransacao.Comum),
            new(new DateOnly(2026, 11, 3), -80m, "Restaurante Exemplo", TipoDeTransacao.Comum),
            new(new DateOnly(2026, 11, 4), -60m, "Uber Viagem", TipoDeTransacao.Comum),
            new(new DateOnly(2026, 10, 4), -999m, "Uber Viagem", TipoDeTransacao.Comum),
        ];
        var limites = new Dictionary<string, decimal> { ["Transporte"] = 200m, ["Alimentação"] = 500m, ["Lazer"] = 100m };

        var orcamento = Orcamento.Acompanhar(limites, transacoes, Categorizador.Padrao, Novembro);

        orcamento.Should().Equal(
            new OrcamentoDoGrupo("Alimentação", 500m, 530m, 106m, SituacaoDoOrcamento.Estourou),
            new OrcamentoDoGrupo("Transporte", 200m, 60m, 30m, SituacaoDoOrcamento.Tranquilo),
            new OrcamentoDoGrupo("Lazer", 100m, 0m, 0m, SituacaoDoOrcamento.Tranquilo));
    }

    [Theory]
    [InlineData(79.9, SituacaoDoOrcamento.Tranquilo)]
    [InlineData(80, SituacaoDoOrcamento.Atencao)]
    [InlineData(100, SituacaoDoOrcamento.Estourou)]
    public void A_situacao_muda_em_80_e_em_100_por_cento(double gasto, SituacaoDoOrcamento esperada)
    {
        Transacao[] transacoes = [new(new DateOnly(2026, 11, 2), -(decimal)gasto, "Uber", TipoDeTransacao.Comum)];

        Orcamento.Acompanhar(new Dictionary<string, decimal> { ["Transporte"] = 100m }, transacoes, Categorizador.Padrao, Novembro)
            .Single().Situacao.Should().Be(esperada);
    }
}

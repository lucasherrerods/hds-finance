using FluentAssertions;

namespace HdsFinance.Domain.Tests;

public class AlertasDoMesTestes
{
    private static readonly MesDeReferencia Outubro = new(2026, 10);

    private static Transacao Gasto(int mes, decimal valor, string descricao) =>
        new(new DateOnly(2026, mes, 5), -valor, descricao, TipoDeTransacao.Comum);

    private static IReadOnlyList<Alerta> Calcular(params Transacao[] transacoes) =>
        AlertasDoMes.Calcular(ResumoMensal.PorMes(transacoes), transacoes, Outubro, Categorizador.Padrao);

    [Fact]
    public void Categoria_bem_acima_da_media_dos_meses_anteriores_vira_alerta()
    {
        var alertas = Calcular(
            Gasto(7, 300m, "Supermercado Exemplo"), Gasto(8, 300m, "Supermercado Exemplo"), Gasto(9, 300m, "Supermercado Exemplo"),
            Gasto(10, 500m, "Supermercado Exemplo"));

        alertas.Should().ContainSingle().Which.Should().Be(new Alerta(TipoDeAlerta.GastoAcimaDaMedia, "Supermercado", 500m, 300m));
    }

    [Fact]
    public void Aumento_pequeno_em_reais_nao_vira_alerta()
    {
        Calcular(Gasto(9, 20m, "Supermercado Exemplo"), Gasto(10, 60m, "Supermercado Exemplo")).Should().BeEmpty();
    }

    [Fact]
    public void Categoria_sem_gasto_antes_vira_alerta_de_categoria_nova()
    {
        var alertas = Calcular(Gasto(9, 100m, "Supermercado Exemplo"), Gasto(10, 100m, "Supermercado Exemplo"), Gasto(10, 200m, "Farmacia Exemplo"));

        alertas.Should().ContainSingle().Which.Tipo.Should().Be(TipoDeAlerta.CategoriaNova);
    }

    [Fact]
    public void Sem_meses_anteriores_nao_ha_alerta()
    {
        Calcular(Gasto(10, 900m, "Supermercado Exemplo"), Gasto(10, 30m, "Netflix")).Should().BeEmpty();
    }

    [Fact]
    public void Assinatura_que_ficou_mais_cara_e_a_que_apareceu_viram_alerta()
    {
        var alertas = Calcular(
            Gasto(9, 39.90m, "Netflix"), Gasto(9, 100m, "Supermercado Exemplo"),
            Gasto(10, 44.90m, "Netflix"), Gasto(10, 21.90m, "Spotify"), Gasto(10, 100m, "Supermercado Exemplo"));

        alertas.Should().Contain(new Alerta(TipoDeAlerta.AssinaturaMaisCara, "Netflix", 44.90m, 39.90m));
        alertas.Should().Contain(new Alerta(TipoDeAlerta.AssinaturaNova, "Spotify", 21.90m, null));
    }

    [Fact]
    public void O_texto_do_alerta_vem_em_reais()
    {
        new Alerta(TipoDeAlerta.GastoAcimaDaMedia, "Supermercado", 500m, 300m).Texto
            .Should().Be("Supermercado: R$ 500,00, acima da média de R$ 300,00.");
    }
}

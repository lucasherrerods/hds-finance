using FluentAssertions;

namespace HdsFinance.Domain.Tests;

public class PanoramaDoMesTestes
{
    private static Transacao Gasto(int mes, decimal valor, string descricao) =>
        new(new DateOnly(2026, mes, 5), -valor, descricao, TipoDeTransacao.Comum);

    private static readonly IReadOnlyList<ResumoMensal> Meses = ResumoMensal.PorMes(
    [
        Gasto(9, 100m, "Supermercado Exemplo"), Gasto(9, 50m, "Ifood"),
        Gasto(10, 200m, "Supermercado Exemplo"), Gasto(10, 80m, "Uber"),
    ]);

    [Fact]
    public void Junta_as_categorias_por_grupo_e_compara_com_a_media()
    {
        var panorama = PanoramaDoMes.Montar(Meses, new MesDeReferencia(2026, 10))!;

        panorama.Saidas.Should().Be(280m);
        panorama.MediaDasSaidas.Should().Be(150m);
        panorama.Grupos.Should().Contain(new GrupoNoPanorama("Alimentação", 200m, 150m));
        panorama.Grupos.Should().Contain(new GrupoNoPanorama("Transporte", 80m, 0m));
    }

    [Fact]
    public void Mes_fora_do_historico_nao_tem_panorama() =>
        PanoramaDoMes.Montar(Meses, new MesDeReferencia(2025, 1)).Should().BeNull();

    [Theory]
    [InlineData("Alimentação", 350)]
    [InlineData("alimentacao", 350)]
    [InlineData("Supermercado", 300)]
    [InlineData("Transporte", 80)]
    public void Soma_a_categoria_ou_o_grupo_no_periodo(string nome, decimal esperado) =>
        ConsultaDeGastos.NoPeriodo(Meses, nome, new MesDeReferencia(2026, 9), new MesDeReferencia(2026, 10)).Should().Be(esperado);

    [Theory]
    [InlineData("transporte publico", "Transporte público")]
    [InlineData("SAÚDE", "Saúde")]
    [InlineData("inventada", null)]
    public void Reconhece_o_nome_sem_acento_nem_maiusculas(string nome, string? esperado) =>
        ConsultaDeGastos.NomeConhecido(nome).Should().Be(esperado);
}

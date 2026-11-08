using FluentAssertions;

namespace HdsFinance.Domain.Tests;

public class CategorizadorTestes
{
    private static Transacao Gasto(string descricao, decimal valor = -10m) =>
        new(new DateOnly(2026, 10, 1), valor, descricao, TipoDeTransacao.Comum);

    private readonly Categorizador _categorizador = new(
    [
        new RegraDeCategoria("Alimentação", ["mercado", "padaria"]),
        new RegraDeCategoria("Transporte", ["uber", "posto"]),
    ]);

    [Theory]
    [InlineData("Compra no debito Mercado Exemplo", "Alimentação")]
    [InlineData("PADARIA DO BAIRRO", "Alimentação")]
    [InlineData("Uber *Viagem", "Transporte")]
    public void Encontra_a_categoria_pelas_palavras_da_descricao(string descricao, string esperada)
    {
        _categorizador.Categorizar(Gasto(descricao)).Should().Be(esperada);
    }

    [Theory]
    [InlineData("Livraria Central")]
    [InlineData("Supermercadinho")]
    public void Sem_regra_que_bata_fica_sem_categoria(string descricao)
    {
        _categorizador.Categorizar(Gasto(descricao)).Should().Be(Categorizador.SemCategoria);
    }

    [Fact]
    public void A_primeira_regra_que_bate_vence()
    {
        _categorizador.Categorizar(Gasto("Posto com mercado")).Should().Be("Alimentação");
    }

    [Fact]
    public void As_regras_padrao_cobrem_gastos_comuns()
    {
        Categorizador.Padrao.Categorizar(Gasto("Pag*Ifood Restaurante")).Should().Be("Alimentação");
        Categorizador.Padrao.Categorizar(Gasto("Drogaria Exemplo")).Should().Be("Saúde");
    }
}

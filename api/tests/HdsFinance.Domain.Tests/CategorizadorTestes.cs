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

    [Theory]
    [InlineData("IFD*IFOOD SAO PAULO")]
    [InlineData("PG *UBER TRIP")]
    [InlineData("MERCADO.EXEMPLO-LTDA")]
    public void Pontuacao_colada_nas_palavras_nao_atrapalha(string descricao)
    {
        Categorizador.Padrao.Categorizar(Gasto(descricao)).Should().NotBe(Categorizador.SemCategoria);
    }

    [Theory]
    [InlineData("Compra no debito Netflix.com", "Assinaturas")]
    [InlineData("Compra no debito Amazon Prime Video", "Assinaturas")]
    [InlineData("MERCADOLIVRE*LOJAFICTICIA", "Compras")]
    [InlineData("Compra no debito Assai Atacadista", "Alimentação")]
    [InlineData("Pagamento efetuado Sabesp", "Moradia")]
    [InlineData("Compra no debito Drogasil", "Saúde")]
    [InlineData("Compra no debito Sympla Ingresso", "Lazer")]
    [InlineData("Compra no debito Udemy Curso", "Educação")]
    [InlineData("Compra no debito Petz Loja", "Pets")]
    [InlineData("Tarifa IOF compra internacional", "Tarifas e impostos")]
    [InlineData("Pagamento IPVA 2026", "Tarifas e impostos")]
    public void As_regras_padrao_reconhecem_os_nomes_mais_comuns(string descricao, string esperada)
    {
        Categorizador.Padrao.Categorizar(Gasto(descricao)).Should().Be(esperada);
    }
}

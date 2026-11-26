using FluentAssertions;

namespace HdsFinance.Domain.Tests;

public class GruposDeCategoriaTestes
{
    [Theory]
    [InlineData("Supermercado", "Alimentação")]
    [InlineData("Lanches e guloseimas", "Alimentação")]
    [InlineData("Compras", "Compras")]
    [InlineData("Vestuário", "Compras")]
    [InlineData("Universidade", "Educação")]
    [InlineData("Bem-estar", "Saúde")]
    [InlineData("Táxi e transporte privado urbano", "Transporte")]
    [InlineData("Empréstimos", "Finanças")]
    [InlineData("Sem categoria", "Outros")]
    [InlineData("Alimentação", "Alimentação")]
    [InlineData("Assinaturas", "Serviços digitais")]
    [InlineData("Tarifas e impostos", "Finanças")]
    [InlineData("Uma que a pessoa inventou", "Outros")]
    [InlineData("Entrada", "Entrada")]
    [InlineData("Investimentos e transferências", "Investimentos e transferências")]
    public void Cada_categoria_cai_no_seu_grupo_e_as_antigas_tambem(string categoria, string grupo) =>
        GruposDeCategoria.GrupoDe(categoria).Should().Be(grupo);

    [Fact]
    public void Toda_categoria_das_regras_tem_grupo_proprio() =>
        Categorizador.Padrao.Categorias.Should().OnlyContain(c => GruposDeCategoria.Todos.Any(g => g.Categorias.Contains(c)));

    [Theory]
    [InlineData("Compra no débito - Mercado Livre", "Compras online")]
    [InlineData("Compra no débito - Amazon Prime", "Streaming de vídeo")]
    [InlineData("Compra no débito - Supermercado Exemplo", "Supermercado")]
    [InlineData("Pix enviado - Ifood", "Delivery de alimentos")]
    public void A_ordem_das_regras_desfaz_os_nomes_parecidos(string descricao, string categoria) =>
        Categorizador.Padrao.Categorizar(new Transacao(new DateOnly(2026, 11, 1), -10m, descricao, TipoDeTransacao.Comum)).Should().Be(categoria);
}

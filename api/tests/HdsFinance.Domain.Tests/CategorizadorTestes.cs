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
        Categorizador.Padrao.Categorizar(Gasto("Pag*Ifood Restaurante")).Should().Be("Delivery de alimentos");
        Categorizador.Padrao.Categorizar(Gasto("Drogaria Exemplo")).Should().Be("Farmácia");
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
    [InlineData("Compra no debito Netflix.com", "Streaming de vídeo")]
    [InlineData("Compra no debito Amazon Prime Video", "Streaming de vídeo")]
    [InlineData("MERCADOLIVRE*LOJAFICTICIA", "Compras online")]
    [InlineData("Compra no debito Assai Atacadista", "Supermercado")]
    [InlineData("Pagamento efetuado Sabesp", "Contas da casa")]
    [InlineData("Compra no debito Drogasil", "Farmácia")]
    [InlineData("Compra no debito Sympla Ingresso", "Cinema e eventos")]
    [InlineData("Compra no debito Udemy Curso", "Cursos")]
    [InlineData("Compra no debito Petz Loja", "Pet shop e veterinário")]
    [InlineData("Tarifa IOF compra internacional", "Tarifas bancárias")]
    [InlineData("Pagamento IPVA 2026", "Impostos")]
    public void As_regras_padrao_reconhecem_os_nomes_mais_comuns(string descricao, string esperada)
    {
        Categorizador.Padrao.Categorizar(Gasto(descricao)).Should().Be(esperada);
    }

    [Fact]
    public void A_correcao_aprendida_vale_para_a_mesma_descricao_e_vence_as_regras()
    {
        var comCorrecao = _categorizador.ComAprendidas([new CategoriaAprendida("PIX ENVIADO JOAO S", "Moradia")]);

        comCorrecao.Categorizar(Gasto("Pix enviado João S.")).Should().Be("Moradia");
        comCorrecao.Categorizar(Gasto("Pix enviado Maria")).Should().Be(Categorizador.SemCategoria);
        comCorrecao.ComAprendidas([new CategoriaAprendida("Mercado Exemplo", "Lazer")])
            .Categorizar(Gasto("MERCADO EXEMPLO")).Should().Be("Lazer");
    }

    [Fact]
    public void A_chave_da_correcao_ignora_acento_caixa_e_pontuacao()
    {
        Categorizador.ChaveDaDescricao("Pix enviado: João S.").Should().Be(Categorizador.ChaveDaDescricao("PIX ENVIADO JOAO S"));
    }

    [Fact]
    public void Lista_as_categorias_possiveis_para_escolher()
    {
        _categorizador.Categorias.Should().Equal("Alimentação", "Transporte", Emprestimo.Categoria, Categorizador.SemCategoria);
    }
}

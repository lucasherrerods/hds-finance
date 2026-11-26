using FluentAssertions;
using HdsFinance.Application.Assistente;
using HdsFinance.Domain;

namespace HdsFinance.Application.Tests.Assistente;

public class SugerirCategoriasTestes
{
    private static readonly Transacao[] Transacoes =
    [
        new(new DateOnly(2026, 10, 2), -30m, "Pagamento XPTO", TipoDeTransacao.Comum),
        new(new DateOnly(2026, 10, 3), -50m, "Supermercado Exemplo", TipoDeTransacao.Comum),
    ];

    private static Task<IReadOnlyList<SugestaoDeCategoria>> SugerirAsync(IAssistente assistente) =>
        new SugerirCategorias(assistente, new MemoriaDoAssistente(), Categorizador.Padrao).ExecutarAsync(Transacoes);

    [Fact]
    public async Task So_as_sem_categoria_vao_para_a_ia()
    {
        var assistente = new AssistenteFalso("{\"sugestoes\":[]}");

        await SugerirAsync(assistente);

        assistente.Pedidos.Single().Should().Contain("Pagamento XPTO").And.NotContain("Supermercado Exemplo");
    }

    [Fact]
    public async Task Descarta_categoria_inventada_e_descricao_que_nao_foi_pedida()
    {
        var sugestoes = await SugerirAsync(new AssistenteFalso(
            "{\"sugestoes\":[{\"descricao\":\"Pagamento XPTO\",\"categoria\":\"Jogos\"}," +
            "{\"descricao\":\"Outra\",\"categoria\":\"Jogos\"},{\"descricao\":\"Pagamento XPTO\",\"categoria\":\"Inventada\"}]}"));

        sugestoes.Should().ContainSingle().Which.Should().Be(new SugestaoDeCategoria("Pagamento XPTO", "Jogos", 1, 30m));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("não é json")]
    [InlineData("[1,2]")]
    public async Task Resposta_ruim_vira_lista_vazia(string? resposta) =>
        (await SugerirAsync(new AssistenteFalso(resposta))).Should().BeEmpty();
}

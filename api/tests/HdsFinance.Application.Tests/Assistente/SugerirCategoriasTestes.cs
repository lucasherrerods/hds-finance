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

    private static readonly Transacao[] DeDoisMeses =
    [
        .. Transacoes,
        new(new DateOnly(2026, 11, 4), -20m, "Pagamento ZYXW", TipoDeTransacao.Comum),
        new(new DateOnly(2026, 11, 9), -15m, "Pagamento ZYXW", TipoDeTransacao.Comum),
    ];

    [Fact]
    public void Lista_os_meses_com_gasto_sem_categoria_do_mais_novo_para_o_mais_antigo()
    {
        var meses = new SugerirCategorias(new AssistenteFalso(null), new MemoriaDoAssistente(), Categorizador.Padrao).MesesSemCategoria(DeDoisMeses);

        meses.Should().Equal(new MesSemCategoria(2026, 11, 2), new MesSemCategoria(2026, 10, 1));
    }

    [Fact]
    public async Task Com_um_mes_escolhido_so_ele_vai_para_a_ia()
    {
        var assistente = new AssistenteFalso("{\"sugestoes\":[]}");

        await new SugerirCategorias(assistente, new MemoriaDoAssistente(), Categorizador.Padrao)
            .ExecutarAsync(DeDoisMeses, new MesDeReferencia(2026, 11));

        assistente.Pedidos.Single().Should().Contain("Pagamento ZYXW").And.NotContain("Pagamento XPTO");
    }
}

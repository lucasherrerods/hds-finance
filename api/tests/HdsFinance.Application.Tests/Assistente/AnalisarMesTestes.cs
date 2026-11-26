using FluentAssertions;
using HdsFinance.Application.Assistente;
using HdsFinance.Domain;

namespace HdsFinance.Application.Tests.Assistente;

public class AnalisarMesTestes
{
    private static readonly MesDeReferencia Outubro = new(2026, 10);

    private static readonly Transacao[] Transacoes =
    [
        new(new DateOnly(2026, 9, 5), -100m, "Supermercado Fulano da Silva", TipoDeTransacao.Comum),
        new(new DateOnly(2026, 10, 5), -400m, "Supermercado Fulano da Silva", TipoDeTransacao.Comum),
    ];

    private static Task<AnaliseDoMes?> AnalisarAsync(IAssistente assistente, MemoriaDoAssistente? memoria = null) =>
        new AnalisarMes(assistente, memoria ?? new MemoriaDoAssistente()).ExecutarAsync(ResumoMensal.PorMes(Transacoes), Transacoes, Outubro);

    [Fact]
    public async Task Junta_os_alertas_e_o_comentario_da_ia()
    {
        var analise = await AnalisarAsync(new AssistenteFalso(" Supermercado pesou mais. "));

        analise!.Comentario.Should().Be("Supermercado pesou mais.");
        analise.Alertas.Should().ContainSingle().Which.Tipo.Should().Be(TipoDeAlerta.GastoAcimaDaMedia);
    }

    [Fact]
    public async Task Para_a_ia_vao_so_totais_nunca_a_descricao_da_transacao()
    {
        var assistente = new AssistenteFalso("ok");

        await AnalisarAsync(assistente);

        assistente.Pedidos.Should().ContainSingle().Which.Should().NotContain("Fulano").And.Contain("Alimentação");
    }

    [Fact]
    public async Task Sem_ia_os_alertas_continuam()
    {
        var analise = await AnalisarAsync(new AssistenteFalso(null));

        analise!.Comentario.Should().BeNull();
        analise.Alertas.Should().NotBeEmpty();
        analise.Mensagem().Should().Contain("Alertas:");
    }

    [Fact]
    public async Task O_mesmo_pedido_nao_chama_a_ia_duas_vezes()
    {
        var assistente = new AssistenteFalso("ok");
        var memoria = new MemoriaDoAssistente();

        await AnalisarAsync(assistente, memoria);
        await AnalisarAsync(assistente, memoria);

        assistente.Pedidos.Should().HaveCount(1);
    }
}

using FluentAssertions;
using HdsFinance.Application.Assistente;
using HdsFinance.Domain;
using Microsoft.Extensions.Time.Testing;

namespace HdsFinance.Application.Tests.Assistente;

public class ResponderPerguntaTestes
{
    private static readonly IReadOnlyList<ResumoMensal> Meses = ResumoMensal.PorMes(
    [
        new(new DateOnly(2026, 9, 5), -100m, "Supermercado Exemplo", TipoDeTransacao.Comum),
        new(new DateOnly(2026, 10, 5), -200m, "Supermercado Exemplo", TipoDeTransacao.Comum),
        new(new DateOnly(2026, 10, 6), -80m, "Uber", TipoDeTransacao.Comum),
    ]);

    private static Task<string> PerguntarAsync(string? resposta, string pergunta = "quanto gastei?") =>
        new ResponderPergunta(new AssistenteFalso(resposta), new MemoriaDoAssistente(), new FakeTimeProvider(new DateTimeOffset(2026, 11, 26, 12, 0, 0, TimeSpan.Zero)))
            .ExecutarAsync(Meses, pergunta);

    [Fact]
    public async Task O_valor_sai_das_contas_e_nao_da_ia() =>
        (await PerguntarAsync("{\"tipo\":\"gasto\",\"nome\":\"alimentacao\",\"de\":\"2026-09\",\"ate\":\"2026-10\"}"))
            .Should().Be("Alimentação: R$ 300,00 em setembro de 2026 a outubro de 2026.");

    [Fact]
    public async Task Resumo_do_mes() =>
        (await PerguntarAsync("{\"tipo\":\"resumo\",\"de\":\"2026-10\",\"ate\":\"2026-10\"}"))
            .Should().Contain("saiu R$ 280,00");

    [Fact]
    public async Task Onde_mais_gastou() =>
        (await PerguntarAsync("{\"tipo\":\"maiores\",\"de\":\"2026-10\",\"ate\":\"2026-10\"}"))
            .Should().Contain("1. Supermercado: R$ 200,00");

    [Theory]
    [InlineData("{\"tipo\":\"gasto\",\"nome\":\"Inventada\"}")]
    [InlineData("{\"tipo\":\"nenhuma\"}")]
    [InlineData("lixo")]
    public async Task O_que_nao_da_para_responder_vira_exemplo(string resposta) =>
        (await PerguntarAsync(resposta)).Should().Be(ResponderPergunta.NaoEntendi);

    [Fact]
    public async Task Sem_ia_avisa() => (await PerguntarAsync(null)).Should().Be(ResponderPergunta.SemIa);

    [Fact]
    public async Task Periodo_sem_dados_avisa() =>
        (await PerguntarAsync("{\"tipo\":\"resumo\",\"de\":\"2020-01\",\"ate\":\"2020-01\"}")).Should().Contain("Não há extratos");
}

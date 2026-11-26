using System.Net;
using System.Text.Json;
using FluentAssertions;
using HdsFinance.Infrastructure.Assistente;
using Microsoft.Extensions.Options;

namespace HdsFinance.Infrastructure.Tests.Assistente;

internal sealed class GeminiFalso(HttpStatusCode status, string resposta) : HttpMessageHandler
{
    public HttpRequestMessage? Requisicao { get; private set; }

    public string? Corpo { get; private set; }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage requisicao, CancellationToken cancelamento)
    {
        Requisicao = requisicao;
        Corpo = await requisicao.Content!.ReadAsStringAsync(cancelamento);
        return new HttpResponseMessage(status) { Content = new StringContent(resposta) };
    }
}

public class AssistenteGeminiTestes
{
    private const string Resposta = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\" Olá \"}]}}]}";

    private static (AssistenteGemini Assistente, GeminiFalso Servidor) Montar(
        HttpStatusCode status = HttpStatusCode.OK, string resposta = Resposta, string? chave = "chave-ficticia")
    {
        var servidor = new GeminiFalso(status, resposta);
        var cliente = new HttpClient(servidor) { BaseAddress = new Uri(OpcoesDoAssistente.EnderecoPadrao) };
        return (new AssistenteGemini(cliente, Options.Create(new OpcoesDoAssistente { ChaveDaApi = chave })), servidor);
    }

    [Fact]
    public async Task Le_o_texto_da_resposta_e_manda_a_chave_no_cabecalho()
    {
        var (assistente, servidor) = Montar();

        (await assistente.GerarAsync("instruções", "pedido", json: true)).Should().Be("Olá");

        servidor.Requisicao!.RequestUri!.Query.Should().BeEmpty();
        servidor.Requisicao.Headers.GetValues("x-goog-api-key").Should().ContainSingle("chave-ficticia");
        using var corpo = JsonDocument.Parse(servidor.Corpo!);
        corpo.RootElement.GetProperty("generationConfig").GetProperty("responseMimeType").GetString().Should().Be("application/json");
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests, Resposta)]
    [InlineData(HttpStatusCode.OK, "não é json")]
    [InlineData(HttpStatusCode.OK, "{\"candidates\":[]}")]
    public async Task Falha_vira_nulo(HttpStatusCode status, string resposta) =>
        (await Montar(status, resposta).Assistente.GerarAsync("i", "p")).Should().BeNull();

    [Fact]
    public async Task Sem_chave_nao_chama_a_api()
    {
        var (assistente, servidor) = Montar(chave: null);

        (await assistente.GerarAsync("i", "p")).Should().BeNull();
        servidor.Requisicao.Should().BeNull();
    }
}

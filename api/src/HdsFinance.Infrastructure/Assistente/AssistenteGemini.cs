using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using HdsFinance.Application.Assistente;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HdsFinance.Infrastructure.Assistente;

/// <summary>Configuração da IA. A chave vem de `dotnet user-secrets` ou variável de ambiente, nunca do appsettings.</summary>
public sealed class OpcoesDoAssistente
{
    public const string Secao = "Assistente";
    public const string EnderecoPadrao = "https://generativelanguage.googleapis.com/";
    public const string ModeloPadrao = "gemini-2.5-flash";

    public string? ChaveDaApi { get; set; }

    public string Modelo { get; set; } = ModeloPadrao;

    public string Endereco { get; set; } = EnderecoPadrao;

    public bool Configurado => !string.IsNullOrWhiteSpace(ChaveDaApi);
}

/// <summary>
/// Google Gemini pela API REST, no plano gratuito do AI Studio. Sem chave, falha de rede, cota estourada ou
/// resposta estranha, devolve nulo e o resto do sistema segue sem o texto. Nada do pedido vai para o log.
/// </summary>
public sealed class AssistenteGemini(HttpClient cliente, IOptions<OpcoesDoAssistente> opcoes, ILogger<AssistenteGemini>? log = null) : IAssistente
{
    private sealed record Parte([property: JsonPropertyName("text")] string Texto);

    private sealed record Conteudo(
        [property: JsonPropertyName("parts")] Parte[] Partes,
        [property: JsonPropertyName("role"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Papel = null);

    private sealed record Configuracao(
        [property: JsonPropertyName("temperature")] double Temperatura,
        [property: JsonPropertyName("responseMimeType")] string TipoDaResposta);

    private sealed record Pedido(
        [property: JsonPropertyName("systemInstruction")] Conteudo Instrucoes,
        [property: JsonPropertyName("contents")] Conteudo[] Conteudos,
        [property: JsonPropertyName("generationConfig")] Configuracao Configuracao);

    public async Task<string?> GerarAsync(string instrucoes, string pedido, bool json = false, CancellationToken cancelamento = default)
    {
        var configuracao = opcoes.Value;
        if (!configuracao.Configurado)
        {
            log?.LogWarning("Assistente sem chave: defina Assistente:ChaveDaApi.");
            return null;
        }

        var corpo = new Pedido(
            new Conteudo([new Parte(instrucoes)]),
            [new Conteudo([new Parte(pedido)], "user")],
            new Configuracao(0.3, json ? "application/json" : "text/plain"));

        // A chave vai no cabeçalho, não na URL, para não aparecer em log de acesso.
        using var requisicao = new HttpRequestMessage(HttpMethod.Post, $"v1beta/models/{Uri.EscapeDataString(configuracao.Modelo)}:generateContent")
        {
            Content = JsonContent.Create(corpo),
        };
        requisicao.Headers.Add("x-goog-api-key", configuracao.ChaveDaApi);

        try
        {
            using var resposta = await cliente.SendAsync(requisicao, cancelamento);
            if (!resposta.IsSuccessStatusCode)
            {
                // Só o código e o status do Google (ex.: PERMISSION_DENIED, RESOURCE_EXHAUSTED), nunca o pedido.
                log?.LogWarning("O Gemini recusou o pedido: {Codigo} {Status}", (int)resposta.StatusCode, await StatusDoErroAsync(resposta, cancelamento));
                return null;
            }

            using var documento = await JsonDocument.ParseAsync(await resposta.Content.ReadAsStreamAsync(cancelamento), cancellationToken: cancelamento);
            return TextoDa(documento.RootElement);
        }
        catch (Exception erro) when (erro is HttpRequestException or JsonException or TaskCanceledException)
        {
            log?.LogWarning("Não foi possível falar com o Gemini: {Erro}", erro.GetType().Name);
            return null;
        }
    }

    private static async Task<string> StatusDoErroAsync(HttpResponseMessage resposta, CancellationToken cancelamento)
    {
        try
        {
            using var documento = await JsonDocument.ParseAsync(await resposta.Content.ReadAsStreamAsync(cancelamento), cancellationToken: cancelamento);
            return documento.RootElement.TryGetProperty("error", out var erro) && erro.TryGetProperty("status", out var status)
                ? status.GetString() ?? "?"
                : "?";
        }
        catch (JsonException)
        {
            return "?";
        }
    }

    internal static string? TextoDa(JsonElement raiz)
    {
        if (!raiz.TryGetProperty("candidates", out var candidatos) || candidatos.ValueKind != JsonValueKind.Array || candidatos.GetArrayLength() == 0
            || !candidatos[0].TryGetProperty("content", out var conteudo) || !conteudo.TryGetProperty("parts", out var partes)
            || partes.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        var texto = string.Concat(partes.EnumerateArray()
            .Select(p => p.TryGetProperty("text", out var t) && t.ValueKind == JsonValueKind.String ? t.GetString() : null));
        return string.IsNullOrWhiteSpace(texto) ? null : texto.Trim();
    }
}

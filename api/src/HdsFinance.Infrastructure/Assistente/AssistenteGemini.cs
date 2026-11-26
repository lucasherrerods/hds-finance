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
    public const string ModeloPadrao = "gemini-flash-latest";

    public string? ChaveDaApi { get; set; }

    public string Modelo { get; set; } = ModeloPadrao;

    /// <summary>
    /// Quanto o modelo "pensa" antes de responder (minimal, low, medium, high). Os pedidos daqui são simples,
    /// e pensar muito estoura o tempo limite. Vazio deixa o padrão do modelo.
    /// </summary>
    public string? Raciocinio { get; set; } = "low";

    /// <summary>Tentado quando o principal está sobrecarregado (503), sem cota (429) ou demora demais. Vazio desliga.</summary>
    public string? ModeloReserva { get; set; } = "gemini-flash-lite-latest";

    /// <summary>Limite de cada tentativa; com a reserva, a espera total pode chegar ao dobro.</summary>
    public int SegundosDeEspera { get; set; } = 40;

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

    private sealed record Raciocinio([property: JsonPropertyName("thinkingLevel")] string Nivel);

    private sealed record Configuracao(
        [property: JsonPropertyName("temperature")] double Temperatura,
        [property: JsonPropertyName("responseMimeType")] string TipoDaResposta,
        [property: JsonPropertyName("thinkingConfig"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] Raciocinio? Raciocinio);

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
            new Configuracao(0.3, json ? "application/json" : "text/plain",
                string.IsNullOrWhiteSpace(configuracao.Raciocinio) ? null : new Raciocinio(configuracao.Raciocinio)));

        var modelos = new[] { configuracao.Modelo, configuracao.ModeloReserva }
            .Where(m => !string.IsNullOrWhiteSpace(m)).Select(m => m!.Trim()).Distinct();
        foreach (var modelo in modelos)
        {
            var (texto, tentarOutro) = await TentarAsync(modelo, corpo, configuracao, cancelamento);
            if (texto is not null || !tentarOutro)
            {
                return texto;
            }
        }

        return null;
    }

    /// <summary>Uma chamada a um modelo. Diz se vale tentar o próximo: só em sobrecarga, falta de cota ou demora.</summary>
    private async Task<(string? Texto, bool TentarOutro)> TentarAsync(
        string modelo, Pedido corpo, OpcoesDoAssistente configuracao, CancellationToken cancelamento)
    {
        // A chave vai no cabeçalho, não na URL, para não aparecer em log de acesso.
        using var requisicao = new HttpRequestMessage(HttpMethod.Post, $"v1beta/models/{Uri.EscapeDataString(modelo)}:generateContent")
        {
            Content = JsonContent.Create(corpo),
        };
        requisicao.Headers.Add("x-goog-api-key", configuracao.ChaveDaApi);

        using var limite = CancellationTokenSource.CreateLinkedTokenSource(cancelamento);
        limite.CancelAfter(TimeSpan.FromSeconds(Math.Max(5, configuracao.SegundosDeEspera)));

        try
        {
            using var resposta = await cliente.SendAsync(requisicao, limite.Token);
            if (!resposta.IsSuccessStatusCode)
            {
                // Só o código e o status do Google (ex.: UNAVAILABLE, RESOURCE_EXHAUSTED), nunca o pedido.
                log?.LogWarning("O Gemini ({Modelo}) recusou o pedido: {Codigo} {Status}",
                    modelo, (int)resposta.StatusCode, await StatusDoErroAsync(resposta, limite.Token));
                return (null, (int)resposta.StatusCode is 429 or 500 or 503 or 504);
            }

            using var documento = await JsonDocument.ParseAsync(await resposta.Content.ReadAsStreamAsync(limite.Token), cancellationToken: limite.Token);
            return (TextoDa(documento.RootElement), false);
        }
        catch (Exception erro) when (erro is HttpRequestException or JsonException or TaskCanceledException)
        {
            log?.LogWarning("Não foi possível falar com o Gemini ({Modelo}): {Erro}",
                modelo, erro is TaskCanceledException ? "tempo esgotado" : erro.GetType().Name);
            // Se quem cancelou foi a requisição do painel, não adianta tentar outro modelo.
            return (null, !cancelamento.IsCancellationRequested && erro is not JsonException);
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

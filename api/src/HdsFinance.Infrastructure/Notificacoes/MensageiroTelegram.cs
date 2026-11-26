using System.Net.Http.Json;
using System.Text.Json.Serialization;
using HdsFinance.Application.Assistente;
using Microsoft.Extensions.Options;

namespace HdsFinance.Infrastructure.Notificacoes;

/// <summary>Configuração do bot. Token e segredo vêm de `dotnet user-secrets` ou variável de ambiente.</summary>
public sealed class OpcoesDoTelegram
{
    public const string Secao = "Telegram";
    public const string EnderecoPadrao = "https://api.telegram.org/";

    /// <summary>O token que o @BotFather entrega.</summary>
    public string? Token { get; set; }

    /// <summary>O id da conversa do admin com o bot. Mensagem de qualquer outro chat é ignorada.</summary>
    public long? ChatId { get; set; }

    /// <summary>Texto aleatório combinado com o Telegram no setWebhook; ele volta no cabeçalho de cada chamada.</summary>
    public string? SegredoDoWebhook { get; set; }

    public string Endereco { get; set; } = EnderecoPadrao;

    public bool Configurado => !string.IsNullOrWhiteSpace(Token) && ChatId is not (null or 0);
}

/// <summary>Manda mensagens e arquivos só para o chat do admin, pela Bot API do Telegram. Falha vira falso, sem detalhe no log.</summary>
public sealed class MensageiroTelegram(HttpClient cliente, IOptions<OpcoesDoTelegram> opcoes) : IMensageiro
{
    /// <summary>O Telegram corta mensagens acima de 4096 caracteres.</summary>
    public const int TamanhoMaximo = 4000;

    private sealed record Mensagem(
        [property: JsonPropertyName("chat_id")] long Chat,
        [property: JsonPropertyName("text")] string Texto);

    public bool Configurado => opcoes.Value.Configurado;

    public Task<bool> EnviarTextoAsync(string texto, CancellationToken cancelamento = default)
    {
        if (!Configurado)
        {
            return Task.FromResult(false);
        }

        var corte = texto.Length > TamanhoMaximo ? texto[..TamanhoMaximo] + "…" : texto;
        return PostarAsync("sendMessage", JsonContent.Create(new Mensagem(opcoes.Value.ChatId!.Value, corte)), cancelamento);
    }

    public Task<bool> EnviarArquivoAsync(string nome, byte[] conteudo, string legenda, CancellationToken cancelamento = default)
    {
        if (!Configurado)
        {
            return Task.FromResult(false);
        }

        var formulario = new MultipartFormDataContent
        {
            { new StringContent(opcoes.Value.ChatId!.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)), "chat_id" },
            { new StringContent(legenda), "caption" },
            { new ByteArrayContent(conteudo), "document", nome },
        };
        return PostarAsync("sendDocument", formulario, cancelamento);
    }

    private async Task<bool> PostarAsync(string metodo, HttpContent corpo, CancellationToken cancelamento)
    {
        using (corpo)
        {
            try
            {
                using var resposta = await cliente.PostAsync($"./bot{opcoes.Value.Token}/{metodo}", corpo, cancelamento);
                return resposta.IsSuccessStatusCode;
            }
            catch (Exception erro) when (erro is HttpRequestException or TaskCanceledException)
            {
                return false;
            }
        }
    }
}

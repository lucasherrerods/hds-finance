using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using HdsFinance.Application.Assistente;
using HdsFinance.Infrastructure.Notificacoes;
using Microsoft.Extensions.Options;

namespace HdsFinance.Api.Admin;

/// <summary>
/// Webhook do bot do Telegram. Só responde quando o cabeçalho traz o segredo combinado no setWebhook
/// e a mensagem vem do chat do admin; o resto recebe 200 sem resposta, para o Telegram não insistir.
/// </summary>
public static class RotasDoTelegram
{
    public const string CabecalhoDoSegredo = "X-Telegram-Bot-Api-Secret-Token";

    public static void MapearTelegram(this IEndpointRouteBuilder app) =>
        app.MapPost("/telegram/webhook", ReceberAsync).DisableAntiforgery();

    private static async Task<IResult> ReceberAsync(
        HttpRequest requisicao, IOptions<OpcoesDoTelegram> opcoes, ConversaDoBot conversa, IMensageiro mensageiro, CancellationToken cancelamento)
    {
        var configuracao = opcoes.Value;
        if (!configuracao.Configurado || string.IsNullOrWhiteSpace(configuracao.SegredoDoWebhook))
        {
            return Results.NotFound();
        }

        if (!SegredoConfere(requisicao.Headers[CabecalhoDoSegredo].ToString(), configuracao.SegredoDoWebhook))
        {
            return Results.Unauthorized();
        }

        if (await LerMensagemAsync(requisicao, cancelamento) is not ({ } chat, var texto) || chat != configuracao.ChatId)
        {
            return Results.Ok();
        }

        await mensageiro.EnviarTextoAsync(await conversa.ResponderAsync(texto, cancelamento), cancelamento);
        return Results.Ok();
    }

    private static bool SegredoConfere(string recebido, string esperado) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(recebido), Encoding.UTF8.GetBytes(esperado));

    /// <summary>O id do chat e o texto da mensagem; nulo para o que não é mensagem de texto.</summary>
    internal static async Task<(long? Chat, string? Texto)> LerMensagemAsync(HttpRequest requisicao, CancellationToken cancelamento)
    {
        try
        {
            using var json = await JsonDocument.ParseAsync(requisicao.Body, cancellationToken: cancelamento);
            if (!json.RootElement.TryGetProperty("message", out var mensagem)
                || !mensagem.TryGetProperty("chat", out var chat) || !chat.TryGetProperty("id", out var id) || !id.TryGetInt64(out var chatId)
                || !mensagem.TryGetProperty("text", out var texto) || texto.ValueKind != JsonValueKind.String)
            {
                return (null, null);
            }

            return (chatId, texto.GetString());
        }
        catch (JsonException)
        {
            return (null, null);
        }
    }
}

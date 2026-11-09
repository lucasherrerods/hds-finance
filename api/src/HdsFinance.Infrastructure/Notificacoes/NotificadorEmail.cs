using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using HdsFinance.Application.EmailDaDemo;
using HdsFinance.Application.ModoPessoal;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Relatorios;
using Microsoft.Extensions.Options;

namespace HdsFinance.Infrastructure.Notificacoes;

/// <summary>Configuração do e-mail. A chave vem de variável de ambiente ou `dotnet user-secrets`, nunca do appsettings.</summary>
public sealed class OpcoesDeEmail
{
    public const string Secao = "Email";
    public const string EnderecoPadrao = "https://api.resend.com/";

    public string? ChaveDaApi { get; set; }

    public string? Remetente { get; set; }

    /// <summary>Só no modo pessoal: o dono, que recebe o fechamento.</summary>
    public string? Destinatario { get; set; }

    public string Endereco { get; set; } = EnderecoPadrao;
}

/// <summary>
/// Envia pelo Resend, um serviço transacional, para não deixar cópia na caixa de enviados de uma conta pessoal.
/// Falhas nunca trazem o endereço.
/// </summary>
public sealed class EnvioDeEmailResend(HttpClient cliente, IOptions<OpcoesDeEmail> opcoes) : IEnvioDeEmail
{
    private sealed record Anexo(
        [property: JsonPropertyName("filename")] string Nome,
        [property: JsonPropertyName("content")] string Conteudo);

    private sealed record Mensagem(
        [property: JsonPropertyName("from")] string De,
        [property: JsonPropertyName("to")] string[] Para,
        [property: JsonPropertyName("subject")] string Assunto,
        [property: JsonPropertyName("html")] string Html,
        [property: JsonPropertyName("attachments"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] Anexo[]? Anexos);

    public async Task<ResultadoDoEnvio> EnviarAsync(EmailParaEnviar email, CancellationToken cancelamento = default)
    {
        var configuracao = opcoes.Value;
        if (string.IsNullOrWhiteSpace(configuracao.ChaveDaApi) || string.IsNullOrWhiteSpace(configuracao.Remetente))
        {
            return new ResultadoDoEnvio.Falha("E-mail não configurado: defina Email:ChaveDaApi e Email:Remetente.");
        }

        var mensagem = new Mensagem(
            configuracao.Remetente,
            [email.Para],
            email.Assunto,
            email.Html,
            email.Anexo is { } anexo ? [new Anexo(anexo.Nome, Convert.ToBase64String(anexo.Conteudo))] : null);

        using var requisicao = new HttpRequestMessage(HttpMethod.Post, "emails") { Content = JsonContent.Create(mensagem) };
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", configuracao.ChaveDaApi);

        try
        {
            using var resposta = await cliente.SendAsync(requisicao, cancelamento);
            return resposta.IsSuccessStatusCode
                ? new ResultadoDoEnvio.Enviado()
                : new ResultadoDoEnvio.Falha($"O serviço de e-mail recusou o envio ({(int)resposta.StatusCode}).");
        }
        catch (HttpRequestException)
        {
            return new ResultadoDoEnvio.Falha("Não foi possível falar com o serviço de e-mail.");
        }
    }
}

/// <summary>Modo pessoal: manda o fechamento para o dono. O corpo não traz valores, tudo fica no PDF anexo.</summary>
public sealed class NotificadorEmail(IEnvioDeEmail envio, IOptions<OpcoesDeEmail> opcoes) : INotificador
{
    public Task<ResultadoDoEnvio> EnviarAsync(MesDeReferencia mes, byte[] pdf, CancellationToken cancelamento = default)
    {
        if (opcoes.Value.Destinatario is not { Length: > 0 } destinatario)
        {
            return Task.FromResult<ResultadoDoEnvio>(new ResultadoDoEnvio.Falha("E-mail não configurado: defina Email:Destinatario."));
        }

        var titulo = $"Fechamento de {FormatoBrasileiro.Mes(mes)}";
        return envio.EnviarAsync(
            new EmailParaEnviar(destinatario, titulo, $"<p>{titulo} em anexo.</p>", new AnexoDoEmail($"fechamento-{mes}.pdf", pdf)),
            cancelamento);
    }
}

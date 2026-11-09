using System.Net.Http.Headers;
using System.Net.Http.Json;
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

    public string? Destinatario { get; set; }

    public string Endereco { get; set; } = EnderecoPadrao;

    public bool Completa =>
        !string.IsNullOrWhiteSpace(ChaveDaApi) && !string.IsNullOrWhiteSpace(Remetente) && !string.IsNullOrWhiteSpace(Destinatario);
}

/// <summary>
/// Envia pelo Resend, um serviço transacional, para não deixar cópia na caixa de enviados de uma conta pessoal.
/// O corpo do e-mail não traz valores: tudo fica no PDF anexo.
/// </summary>
public sealed class NotificadorEmail(HttpClient cliente, IOptions<OpcoesDeEmail> opcoes) : INotificador
{
    private sealed record Anexo(string filename, string content);

    private sealed record Mensagem(string from, string[] to, string subject, string html, Anexo[] attachments);

    public async Task<ResultadoDoEnvio> EnviarAsync(MesDeReferencia mes, byte[] pdf, CancellationToken cancelamento = default)
    {
        var configuracao = opcoes.Value;
        if (!configuracao.Completa)
        {
            return new ResultadoDoEnvio.Falha("E-mail não configurado: defina Email:ChaveDaApi, Email:Remetente e Email:Destinatario.");
        }

        var titulo = $"Fechamento de {FormatoBrasileiro.Mes(mes)}";
        var mensagem = new Mensagem(
            configuracao.Remetente!,
            [configuracao.Destinatario!],
            titulo,
            $"<p>{titulo} em anexo.</p>",
            [new Anexo($"fechamento-{mes}.pdf", Convert.ToBase64String(pdf))]);

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

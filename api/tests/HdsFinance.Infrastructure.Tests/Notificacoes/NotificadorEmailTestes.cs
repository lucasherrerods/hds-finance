using System.Net;
using System.Text.Json;
using FluentAssertions;
using HdsFinance.Application.ModoPessoal;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Notificacoes;
using Microsoft.Extensions.Options;

namespace HdsFinance.Infrastructure.Tests.Notificacoes;

public class NotificadorEmailTestes
{
    private sealed class ServidorFalso(HttpStatusCode status) : HttpMessageHandler
    {
        public HttpRequestMessage? Requisicao { get; private set; }

        public string? Corpo { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage requisicao, CancellationToken cancelamento)
        {
            Requisicao = requisicao;
            Corpo = await requisicao.Content!.ReadAsStringAsync(cancelamento);
            return new HttpResponseMessage(status) { Content = new StringContent("{\"id\":\"x\"}") };
        }
    }

    private static readonly OpcoesDeEmail Opcoes = new()
    {
        ChaveDaApi = "chave-ficticia",
        Remetente = "hds finance <fechamento@exemplo.com>",
        Destinatario = "dono@exemplo.com",
    };

    private static (NotificadorEmail Notificador, ServidorFalso Servidor) Montar(HttpStatusCode status = HttpStatusCode.OK)
    {
        var servidor = new ServidorFalso(status);
        var cliente = new HttpClient(servidor) { BaseAddress = new Uri(OpcoesDeEmail.EnderecoPadrao) };
        return (new NotificadorEmail(cliente, Options.Create(Opcoes)), servidor);
    }

    [Fact]
    public async Task Envia_o_pdf_em_anexo_pelo_servico_transacional()
    {
        var (notificador, servidor) = Montar();

        var resultado = await notificador.EnviarAsync(new MesDeReferencia(2026, 10), [1, 2, 3]);

        resultado.Should().Be(new ResultadoDoEnvio.Enviado());
        servidor.Requisicao!.RequestUri!.AbsolutePath.Should().Be("/emails");
        servidor.Requisicao.Headers.Authorization!.ToString().Should().Be("Bearer chave-ficticia");
        using var json = JsonDocument.Parse(servidor.Corpo!);
        json.RootElement.GetProperty("to")[0].GetString().Should().Be("dono@exemplo.com");
        json.RootElement.GetProperty("subject").GetString().Should().Be("Fechamento de outubro de 2026");
        var anexo = json.RootElement.GetProperty("attachments")[0];
        anexo.GetProperty("filename").GetString().Should().Be("fechamento-2026-10.pdf");
        anexo.GetProperty("content").GetString().Should().Be(Convert.ToBase64String([1, 2, 3]));
    }

    [Fact]
    public async Task Recusa_do_servico_vira_falha_sem_expor_o_endereco()
    {
        var (notificador, _) = Montar(HttpStatusCode.Unauthorized);

        var resultado = await notificador.EnviarAsync(new MesDeReferencia(2026, 10), [1]);

        var falha = resultado.Should().BeOfType<ResultadoDoEnvio.Falha>().Subject;
        falha.Motivo.Should().Contain("401").And.NotContain("dono@exemplo.com");
    }

    [Fact]
    public async Task Sem_configuracao_nao_tenta_enviar()
    {
        var servidor = new ServidorFalso(HttpStatusCode.OK);
        var notificador = new NotificadorEmail(new HttpClient(servidor), Options.Create(new OpcoesDeEmail()));

        var resultado = await notificador.EnviarAsync(new MesDeReferencia(2026, 10), [1]);

        resultado.Should().BeOfType<ResultadoDoEnvio.Falha>();
        servidor.Requisicao.Should().BeNull();
    }
}

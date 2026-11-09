using System.Net;
using System.Text.Json;
using FluentAssertions;
using HdsFinance.Application.EmailDaDemo;
using HdsFinance.Application.ModoPessoal;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Notificacoes;
using Microsoft.Extensions.Options;

namespace HdsFinance.Infrastructure.Tests.Notificacoes;

internal sealed class ServidorFalso(HttpStatusCode status) : HttpMessageHandler
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

public class EnvioDeEmailResendTestes
{
    private static readonly OpcoesDeEmail Opcoes = new()
    {
        ChaveDaApi = "chave-ficticia",
        Remetente = "hds finance <fechamento@exemplo.com>",
        Destinatario = "dono@exemplo.com",
    };

    private static (EnvioDeEmailResend Envio, ServidorFalso Servidor) Montar(HttpStatusCode status = HttpStatusCode.OK, OpcoesDeEmail? opcoes = null)
    {
        var servidor = new ServidorFalso(status);
        var cliente = new HttpClient(servidor) { BaseAddress = new Uri(OpcoesDeEmail.EnderecoPadrao) };
        return (new EnvioDeEmailResend(cliente, Options.Create(opcoes ?? Opcoes)), servidor);
    }

    [Fact]
    public async Task Envia_pelo_servico_transacional_com_o_anexo_em_base64()
    {
        var (envio, servidor) = Montar();

        var resultado = await envio.EnviarAsync(new EmailParaEnviar("pessoa@exemplo.com", "Assunto", "<p>oi</p>", new AnexoDoEmail("a.pdf", [1, 2, 3])));

        resultado.Should().Be(new ResultadoDoEnvio.Enviado());
        servidor.Requisicao!.RequestUri!.AbsolutePath.Should().Be("/emails");
        servidor.Requisicao.Headers.Authorization!.ToString().Should().Be("Bearer chave-ficticia");
        using var json = JsonDocument.Parse(servidor.Corpo!);
        json.RootElement.GetProperty("from").GetString().Should().Be("hds finance <fechamento@exemplo.com>");
        json.RootElement.GetProperty("to")[0].GetString().Should().Be("pessoa@exemplo.com");
        var anexo = json.RootElement.GetProperty("attachments")[0];
        anexo.GetProperty("filename").GetString().Should().Be("a.pdf");
        anexo.GetProperty("content").GetString().Should().Be(Convert.ToBase64String([1, 2, 3]));
    }

    [Fact]
    public async Task Sem_anexo_nao_manda_a_lista_de_anexos()
    {
        var (envio, servidor) = Montar();

        await envio.EnviarAsync(new EmailParaEnviar("pessoa@exemplo.com", "Código", "<p>123</p>"));

        using var json = JsonDocument.Parse(servidor.Corpo!);
        json.RootElement.TryGetProperty("attachments", out _).Should().BeFalse();
    }

    [Fact]
    public async Task Recusa_do_servico_vira_falha_sem_expor_o_endereco()
    {
        var (envio, _) = Montar(HttpStatusCode.Unauthorized);

        var resultado = await envio.EnviarAsync(new EmailParaEnviar("pessoa@exemplo.com", "a", "b"));

        resultado.Should().BeOfType<ResultadoDoEnvio.Falha>().Which.Motivo.Should().Contain("401").And.NotContain("pessoa@");
    }

    [Fact]
    public async Task Sem_chave_ou_remetente_nao_tenta_enviar()
    {
        var (envio, servidor) = Montar(opcoes: new OpcoesDeEmail());

        (await envio.EnviarAsync(new EmailParaEnviar("pessoa@exemplo.com", "a", "b"))).Should().BeOfType<ResultadoDoEnvio.Falha>();
        servidor.Requisicao.Should().BeNull();
    }
}

public class NotificadorEmailTestes
{
    private sealed class EnvioFalso : IEnvioDeEmail
    {
        public EmailParaEnviar? Enviado { get; private set; }

        public Task<ResultadoDoEnvio> EnviarAsync(EmailParaEnviar email, CancellationToken cancelamento = default)
        {
            Enviado = email;
            return Task.FromResult<ResultadoDoEnvio>(new ResultadoDoEnvio.Enviado());
        }
    }

    [Fact]
    public async Task Manda_o_fechamento_para_o_dono_com_o_pdf_anexo()
    {
        var envio = new EnvioFalso();
        var notificador = new NotificadorEmail(envio, Options.Create(new OpcoesDeEmail { Destinatario = "dono@exemplo.com" }));

        await notificador.EnviarAsync(new MesDeReferencia(2026, 10), [1, 2, 3]);

        envio.Enviado!.Para.Should().Be("dono@exemplo.com");
        envio.Enviado.Assunto.Should().Be("Fechamento de outubro de 2026");
        envio.Enviado.Anexo!.Nome.Should().Be("fechamento-2026-10.pdf");
    }

    [Fact]
    public async Task Sem_destinatario_nao_envia()
    {
        var envio = new EnvioFalso();
        var notificador = new NotificadorEmail(envio, Options.Create(new OpcoesDeEmail()));

        (await notificador.EnviarAsync(new MesDeReferencia(2026, 10), [1])).Should().BeOfType<ResultadoDoEnvio.Falha>();
        envio.Enviado.Should().BeNull();
    }
}

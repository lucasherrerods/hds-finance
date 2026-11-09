using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using FluentAssertions;
using HdsFinance.Application.EmailDaDemo;
using HdsFinance.Application.ModoPessoal;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace HdsFinance.Api.Tests;

public partial class EmailDaDemonstracaoTestes(WebApplicationFactory<Program> fabrica) : IClassFixture<WebApplicationFactory<Program>>
{
    private const string Email = "pessoa@exemplo.com";

    private sealed class CaixaDeEntradaFalsa : IEnvioDeEmail
    {
        public List<EmailParaEnviar> Recebidos { get; } = [];

        public Task<ResultadoDoEnvio> EnviarAsync(EmailParaEnviar email, CancellationToken cancelamento = default)
        {
            lock (Recebidos)
            {
                Recebidos.Add(email);
            }

            return Task.FromResult<ResultadoDoEnvio>(new ResultadoDoEnvio.Enviado());
        }
    }

    private sealed record DesafioJson(string Desafio);

    private sealed record TokenJson(string Token);

    private (HttpClient Cliente, CaixaDeEntradaFalsa Caixa) Montar()
    {
        var caixa = new CaixaDeEntradaFalsa();
        var cliente = fabrica.WithWebHostBuilder(b => b
                .UseSetting("Demonstracao:ChaveDeAssinatura", "chave-de-teste-ficticia-com-mais-de-32-bytes")
                .UseSetting("Demonstracao:LimiteDeRequisicoesPorMinuto", "100")
                .ConfigureTestServices(s => s.AddSingleton<IEnvioDeEmail>(caixa)))
            .CreateClient();
        return (cliente, caixa);
    }

    private static MultipartFormDataContent Formulario(string email, string token)
    {
        var arquivo = new ByteArrayContent(File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "samples", "inter-extrato.ofx")));
        return new MultipartFormDataContent
        {
            { arquivo, "arquivo", "extrato.ofx" },
            { new StringContent(email), "email" },
            { new StringContent(token), "token" },
        };
    }

    private static async Task<string> ConfirmarAsync(HttpClient cliente, CaixaDeEntradaFalsa caixa)
    {
        var pedido = await cliente.PostAsJsonAsync("/demonstracao/email/codigo", new { email = Email });
        var desafio = (await pedido.Content.ReadFromJsonAsync<DesafioJson>())!.Desafio;
        var codigo = SeisDigitos().Match(caixa.Recebidos.Last().Assunto).Value;

        var confirmacao = await cliente.PostAsJsonAsync("/demonstracao/email/confirmar", new { email = Email, codigo, desafio });
        confirmacao.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await confirmacao.Content.ReadFromJsonAsync<TokenJson>())!.Token;
    }

    [Fact]
    public async Task Confirma_o_email_e_envia_o_pdf_do_mes()
    {
        var (cliente, caixa) = Montar();
        var token = await ConfirmarAsync(cliente, caixa);

        var resposta = await cliente.PostAsync("/demonstracao/relatorio/email", Formulario(Email, token));

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
        var relatorio = caixa.Recebidos.Last();
        relatorio.Para.Should().Be(Email);
        relatorio.Anexo!.Nome.Should().Be("fechamento-2026-10.pdf");
    }

    [Fact]
    public async Task Codigo_errado_nao_confirma()
    {
        var (cliente, _) = Montar();
        var pedido = await cliente.PostAsJsonAsync("/demonstracao/email/codigo", new { email = Email });
        var desafio = (await pedido.Content.ReadFromJsonAsync<DesafioJson>())!.Desafio;

        var resposta = await cliente.PostAsJsonAsync("/demonstracao/email/confirmar", new { email = Email, codigo = "abcdef", desafio });

        resposta.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Sem_token_valido_o_relatorio_nao_sai()
    {
        var (cliente, caixa) = Montar();

        var resposta = await cliente.PostAsync("/demonstracao/relatorio/email", Formulario(Email, "token-inventado"));

        resposta.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        caixa.Recebidos.Should().BeEmpty();
    }

    [Fact]
    public async Task Email_invalido_e_recusado()
    {
        var (cliente, _) = Montar();

        var resposta = await cliente.PostAsJsonAsync("/demonstracao/email/codigo", new { email = "sem-arroba" });

        resposta.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Pedidos_demais_de_codigo_para_o_mesmo_email_sao_limitados()
    {
        var (cliente, _) = Montar();
        var email = $"limite-{Guid.NewGuid():N}@exemplo.com";

        for (var i = 0; i < 3; i++)
        {
            await cliente.PostAsJsonAsync("/demonstracao/email/codigo", new { email });
        }

        var quarto = await cliente.PostAsJsonAsync("/demonstracao/email/codigo", new { email });

        quarto.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    [GeneratedRegex(@"\d{6}")]
    private static partial Regex SeisDigitos();
}

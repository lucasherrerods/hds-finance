using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace HdsFinance.Api.Tests;

/// <summary>Atrás do proxy da hospedagem, o limite por IP precisa usar o IP de quem chamou, não o do proxy.</summary>
public class ProxyTestes(WebApplicationFactory<Program> fabrica) : IClassFixture<WebApplicationFactory<Program>>
{
    private HttpClient Cliente(bool confiarNoProxy) => fabrica.WithWebHostBuilder(b => b
            .UseSetting("Demonstracao:LimiteDeRequisicoesPorMinuto", "1")
            .UseSetting("Proxy:ConfiarNoEncaminhamento", confiarNoProxy.ToString()))
        .CreateClient();

    private static async Task<HttpStatusCode> ResumirComo(HttpClient cliente, string ip)
    {
        var arquivo = new ByteArrayContent(File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "samples", "inter-extrato.ofx")));
        using var requisicao = new HttpRequestMessage(HttpMethod.Post, "/demonstracao/resumo")
        {
            Content = new MultipartFormDataContent { { arquivo, "arquivo", "extrato.ofx" } },
        };
        requisicao.Headers.Add("X-Forwarded-For", ip);
        return (await cliente.SendAsync(requisicao)).StatusCode;
    }

    [Fact]
    public async Task Com_proxy_confiavel_cada_ip_tem_o_proprio_limite()
    {
        var cliente = Cliente(confiarNoProxy: true);

        (await ResumirComo(cliente, "203.0.113.1")).Should().Be(HttpStatusCode.OK);
        (await ResumirComo(cliente, "203.0.113.2")).Should().Be(HttpStatusCode.OK);
        (await ResumirComo(cliente, "203.0.113.1")).Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task Sem_proxy_configurado_o_cabecalho_e_ignorado()
    {
        var cliente = Cliente(confiarNoProxy: false);

        (await ResumirComo(cliente, "203.0.113.1")).Should().Be(HttpStatusCode.OK);
        (await ResumirComo(cliente, "203.0.113.2")).Should().Be(HttpStatusCode.TooManyRequests);
    }
}

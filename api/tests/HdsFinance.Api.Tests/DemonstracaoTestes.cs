using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;

namespace HdsFinance.Api.Tests;

public class DemonstracaoTestes(WebApplicationFactory<Program> fabrica) : IClassFixture<WebApplicationFactory<Program>>
{
    private const string Rota = "/demonstracao/resumo";

    private static MultipartFormDataContent Arquivo(byte[] conteudo, string nome)
    {
        var arquivo = new ByteArrayContent(conteudo);
        arquivo.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        return new MultipartFormDataContent { { arquivo, "arquivo", nome } };
    }

    private static byte[] Amostra(string nome) =>
        File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "samples", nome));

    private HttpClient ClienteCom(int limitePorMinuto = 100) =>
        fabrica.WithWebHostBuilder(b => b.UseSetting("Demonstracao:LimiteDeRequisicoesPorMinuto", limitePorMinuto.ToString()))
            .CreateClient();

    [Theory]
    [InlineData("inter-extrato.ofx")]
    [InlineData("inter-extrato.csv")]
    public async Task Resume_o_extrato_sem_contar_investimentos(string amostra)
    {
        var resposta = await ClienteCom().PostAsync(Rota, Arquivo(Amostra(amostra), amostra));

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
        var corpo = await resposta.Content.ReadFromJsonAsync<ResumoDoExtratoJson>();
        corpo!.TransacoesNovas.Should().Be(3);
        corpo.Meses.Should().ContainSingle().Which.Should().Be(new MesJson(2026, 10, 3500m, 123.45m, 3376.55m));
    }

    [Fact]
    public async Task Arquivo_invalido_devolve_problem_details_com_a_linha()
    {
        var csv = Encoding.UTF8.GetBytes("Data Lançamento;Histórico;Descrição;Valor;Saldo\n01/10/2026;Pix;Fulano;xyz;0,00");

        var resposta = await ClienteCom().PostAsync(Rota, Arquivo(csv, "extrato.csv"));

        resposta.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var problema = await resposta.Content.ReadFromJsonAsync<ProblemDetails>();
        problema!.Extensions["linha"]!.ToString().Should().Be("2");
        (await resposta.Content.ReadAsStringAsync()).Should().NotContain("Fulano").And.NotContain("xyz");
    }

    [Fact]
    public async Task Formato_nao_suportado_e_recusado()
    {
        var resposta = await ClienteCom().PostAsync(Rota, Arquivo([1, 2, 3], "extrato.pdf"));

        resposta.StatusCode.Should().Be(HttpStatusCode.UnsupportedMediaType);
    }

    [Fact]
    public async Task Arquivo_acima_do_limite_e_recusado()
    {
        var grande = new byte[3 * 1024 * 1024];

        var resposta = await ClienteCom().PostAsync(Rota, Arquivo(grande, "extrato.ofx"));

        resposta.StatusCode.Should().Be(HttpStatusCode.RequestEntityTooLarge);
    }

    [Fact]
    public async Task Excesso_de_requisicoes_do_mesmo_ip_e_limitado()
    {
        var cliente = ClienteCom(limitePorMinuto: 1);

        await cliente.PostAsync(Rota, Arquivo(Amostra("inter-extrato.ofx"), "inter-extrato.ofx"));
        var segunda = await cliente.PostAsync(Rota, Arquivo(Amostra("inter-extrato.ofx"), "inter-extrato.ofx"));

        segunda.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    private sealed record ResumoDoExtratoJson(int TransacoesNovas, int Duplicadas, IReadOnlyList<MesJson> Meses);

    private sealed record MesJson(int Ano, int Mes, decimal Entradas, decimal Saidas, decimal Resultado);
}

using System.Net;
using System.Net.Http.Headers;
using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace HdsFinance.Api.Tests;

public class RelatorioDaDemonstracaoTestes(WebApplicationFactory<Program> fabrica) : IClassFixture<WebApplicationFactory<Program>>
{
    private const string Rota = "/demonstracao/relatorio";

    private static MultipartFormDataContent Amostra(string nome = "inter-extrato.ofx")
    {
        var arquivo = new ByteArrayContent(File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "samples", nome)));
        arquivo.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        return new MultipartFormDataContent { { arquivo, "arquivo", nome } };
    }

    [Theory]
    [InlineData("inter-extrato.ofx")]
    [InlineData("inter-extrato.csv")]
    public async Task Devolve_o_pdf_do_mes_mais_recente_do_extrato(string amostra)
    {
        var resposta = await fabrica.CreateClient().PostAsync(Rota, Amostra(amostra));

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
        resposta.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
        resposta.Content.Headers.ContentDisposition!.FileNameStar.Should().Be("fechamento-2026-10.pdf");
        var pdf = await resposta.Content.ReadAsByteArrayAsync();
        Encoding.ASCII.GetString(pdf, 0, 5).Should().Be("%PDF-");
    }

    [Fact]
    public async Task Mes_que_nao_esta_no_extrato_devolve_404()
    {
        var resposta = await fabrica.CreateClient().PostAsync($"{Rota}?mes=2026-03", Amostra());

        resposta.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Mes_em_formato_invalido_devolve_400()
    {
        var resposta = await fabrica.CreateClient().PostAsync($"{Rota}?mes=outubro", Amostra());

        resposta.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Formato_nao_suportado_e_recusado()
    {
        var conteudo = new MultipartFormDataContent { { new ByteArrayContent([1, 2, 3]), "arquivo", "extrato.pdf" } };

        var resposta = await fabrica.CreateClient().PostAsync(Rota, conteudo);

        resposta.StatusCode.Should().Be(HttpStatusCode.UnsupportedMediaType);
    }
}

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
        corpo.Meses.Should().ContainSingle().Which.Should().BeEquivalentTo(new MesJson(2026, 10, 3500m, 123.45m, 3376.55m, -1000m, 0m, 2376.55m, [new GastoJson("Alimentação", 123.45m)]));
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

    private sealed record MesJson(
        int Ano, int Mes, decimal Entradas, decimal Saidas, decimal Resultado,
        decimal InvestimentosETransferencias, decimal? SaldoInicial, decimal? SaldoFinal,
        IReadOnlyList<GastoJson> GastosPorCategoria);

    private sealed record GastoJson(string Categoria, decimal Valor);
}

public class DemonstracaoCategoriasTestes(WebApplicationFactory<Program> fabrica) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Regras_de_categoria_vem_da_configuracao()
    {
        var cliente = fabrica.WithWebHostBuilder(b => b
                .UseSetting("Categorias:0:Categoria", "Feira")
                .UseSetting("Categorias:0:Palavras:0", "mercado"))
            .CreateClient();
        var arquivo = new ByteArrayContent(File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "samples", "inter-extrato.csv")));

        var resposta = await cliente.PostAsync("/demonstracao/resumo", new MultipartFormDataContent { { arquivo, "arquivo", "extrato.csv" } });

        (await resposta.Content.ReadAsStringAsync()).Should().Contain("\"categoria\":\"Feira\"");
    }
}

public class DemonstracaoPainelTestes(WebApplicationFactory<Program> fabrica) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Devolve_o_painel_do_ultimo_mes_do_extrato()
    {
        var arquivo = new ByteArrayContent(File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "samples", "inter-extrato.ofx")));

        var resposta = await fabrica.CreateClient()
            .PostAsync("/demonstracao/resumo", new MultipartFormDataContent { { arquivo, "arquivo", "extrato.ofx" } });

        using var json = System.Text.Json.JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        var painel = json.RootElement.GetProperty("painel");
        painel.GetProperty("ano").GetInt32().Should().Be(2026);
        painel.GetProperty("mes").GetInt32().Should().Be(10);
        painel.GetProperty("gastoNoMes").GetDecimal().Should().Be(123.45m);
        painel.GetProperty("gastoNoMesAnterior").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
        painel.GetProperty("ritmo").GetArrayLength().Should().Be(31);
        painel.GetProperty("mapaDeCalor")[0].GetProperty("diaDaSemana").GetInt32().Should().Be(4);
        painel.GetProperty("principaisCategorias")[0].GetProperty("categoria").GetString().Should().Be("Alimentação");
        painel.GetProperty("transacoesRecentes")[0].GetProperty("data").GetString().Should().Be("2026-10-10");
        painel.GetProperty("transacoesRecentes")[0].GetProperty("categoria").GetString().Should().Be("Investimentos e transferências");
    }
}

public class DemonstracaoInvestimentosTestes(WebApplicationFactory<Program> fabrica) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Devolve_o_que_foi_aplicado_e_resgatado_no_mes()
    {
        var arquivo = new ByteArrayContent(File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "samples", "inter-extrato.ofx")));

        var resposta = await fabrica.CreateClient()
            .PostAsync("/demonstracao/resumo", new MultipartFormDataContent { { arquivo, "arquivo", "extrato.ofx" } });

        using var json = System.Text.Json.JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        var investimentos = json.RootElement.GetProperty("meses")[0].GetProperty("investimentos");
        investimentos.GetProperty("aplicado").GetDecimal().Should().Be(1000m);
        investimentos.GetProperty("resgatado").GetDecimal().Should().Be(0m);
        investimentos.GetProperty("aplicadoAcumulado").GetDecimal().Should().Be(1000m);
    }
}

public class DemonstracaoTransacoesTestes(WebApplicationFactory<Program> fabrica) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Devolve_todas_as_transacoes_do_extrato_com_categoria()
    {
        var arquivo = new ByteArrayContent(File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "samples", "inter-extrato.csv")));

        var resposta = await fabrica.CreateClient()
            .PostAsync("/demonstracao/resumo", new MultipartFormDataContent { { arquivo, "arquivo", "extrato.csv" } });

        using var json = System.Text.Json.JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        var transacoes = json.RootElement.GetProperty("transacoes");
        transacoes.GetArrayLength().Should().Be(3);
        transacoes[1].GetProperty("data").GetString().Should().Be("2026-10-05");
        transacoes[1].GetProperty("categoria").GetString().Should().Be("Alimentação");
        transacoes[1].GetProperty("valor").GetDecimal().Should().Be(-123.45m);
    }
}

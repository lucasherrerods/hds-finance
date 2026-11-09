using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace HdsFinance.Api.Tests;

public sealed class ModoPessoalTestes(WebApplicationFactory<Program> fabrica) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly string _banco = Path.Combine(Path.GetTempPath(), $"hds-teste-{Guid.NewGuid():N}.db");

    public void Dispose()
    {
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        File.Delete(_banco);
    }

    private HttpClient Cliente(string modo) => fabrica.WithWebHostBuilder(b => b
            .UseSetting("Modo", modo)
            .UseSetting("ModoPessoal:CaminhoDoBanco", _banco))
        .CreateClient();

    [Fact]
    public async Task O_historico_mostra_o_que_foi_importado_antes()
    {
        var cliente = Cliente("Pessoal");
        var arquivo = new ByteArrayContent(File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "samples", "inter-extrato.ofx")));
        await cliente.PostAsync("/demonstracao/resumo", new MultipartFormDataContent { { arquivo, "arquivo", "extrato.ofx" } });

        var resposta = await cliente.GetAsync("/pessoal/historico");

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
        using var json = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("meses").GetArrayLength().Should().Be(1);
        json.RootElement.GetProperty("painel").GetProperty("mes").GetInt32().Should().Be(10);
        json.RootElement.GetProperty("transacoes").GetArrayLength().Should().Be(3);
    }

    [Fact]
    public async Task No_modo_pessoal_as_rotas_de_email_da_demonstracao_nao_existem()
    {
        var resposta = await Cliente("Pessoal").PostAsync("/demonstracao/email/codigo", new StringContent("{}"));

        resposta.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Na_demonstracao_a_rota_do_historico_nao_existe()
    {
        var resposta = await Cliente("Demonstracao").GetAsync("/pessoal/historico");

        resposta.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

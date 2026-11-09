using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using HdsFinance.Application.ModoPessoal;
using HdsFinance.Domain;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace HdsFinance.Api.Tests;

public sealed class ModoPessoalTestes(WebApplicationFactory<Program> fabrica) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly string _banco = Path.Combine(Path.GetTempPath(), $"hds-teste-{Guid.NewGuid():N}.db");

    public void Dispose()
    {
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        File.Delete(_banco);
    }

    private readonly NotificadorFalso _notificador = new();

    private sealed class NotificadorFalso : INotificador
    {
        public List<MesDeReferencia> Enviados { get; } = [];

        public Task<ResultadoDoEnvio> EnviarAsync(MesDeReferencia mes, byte[] pdf, CancellationToken cancelamento = default)
        {
            Enviados.Add(mes);
            return Task.FromResult<ResultadoDoEnvio>(new ResultadoDoEnvio.Enviado());
        }
    }

    private sealed record ImportacaoJson(int TransacoesNovas, int Duplicadas, string Fechamento);

    private sealed record MensagemJson(string Mensagem);

    private HttpClient Cliente(string modo) => fabrica.WithWebHostBuilder(b => b
            .UseSetting("Modo", modo)
            .UseSetting("ModoPessoal:CaminhoDoBanco", _banco)
            .ConfigureTestServices(s => s.AddSingleton<INotificador>(_notificador)))
        .CreateClient();

    private static MultipartFormDataContent Amostra() => new()
    {
        { new ByteArrayContent(File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "samples", "inter-extrato.ofx"))), "arquivo", "extrato.ofx" },
    };

    [Fact]
    public async Task Adicionar_extrato_guarda_no_historico_e_fecha_o_mes_completo()
    {
        var cliente = Cliente("Pessoal");

        var primeira = await (await cliente.PostAsync("/pessoal/extratos", Amostra())).Content.ReadFromJsonAsync<ImportacaoJson>();
        var segunda = await (await cliente.PostAsync("/pessoal/extratos", Amostra())).Content.ReadFromJsonAsync<ImportacaoJson>();

        primeira.Should().Be(new ImportacaoJson(3, 0, "Fechamento de 2026-10 enviado por e-mail."));
        segunda.Should().Be(new ImportacaoJson(0, 3, "Fechamento de 2026-10 já tinha sido enviado."));
        _notificador.Enviados.Should().ContainSingle();
    }

    [Fact]
    public async Task Gera_o_pdf_de_um_mes_do_historico()
    {
        var cliente = Cliente("Pessoal");
        await cliente.PostAsync("/pessoal/extratos", Amostra());

        var resposta = await cliente.GetAsync("/pessoal/relatorio?mes=2026-10");
        var semDados = await cliente.GetAsync("/pessoal/relatorio?mes=2026-03");

        resposta.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
        semDados.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Enviar_o_fechamento_de_novo_so_com_forcar()
    {
        var cliente = Cliente("Pessoal");
        await cliente.PostAsync("/pessoal/extratos", Amostra());

        var repetido = await cliente.PostAsync("/pessoal/fechamento?mes=2026-10", null);
        var forcado = await cliente.PostAsync("/pessoal/fechamento?mes=2026-10&forcar=true", null);

        repetido.StatusCode.Should().Be(HttpStatusCode.Conflict);
        forcado.StatusCode.Should().Be(HttpStatusCode.OK);
        (await forcado.Content.ReadFromJsonAsync<MensagemJson>())!.Mensagem.Should().Be("Fechamento de 2026-10 enviado por e-mail.");
        _notificador.Enviados.Should().HaveCount(2);
    }

    [Fact]
    public async Task Corrigir_a_categoria_vale_para_a_descricao_no_historico()
    {
        var cliente = Cliente("Pessoal");
        await cliente.PostAsync("/pessoal/extratos", Amostra());

        var resposta = await cliente.PutAsJsonAsync("/pessoal/categorias", new { descricao = "Compra no debito Mercado Exemplo", categoria = "Lazer" });
        var invalida = await cliente.PutAsJsonAsync("/pessoal/categorias", new { descricao = "Compra no debito Mercado Exemplo", categoria = "Inventada" });

        resposta.StatusCode.Should().Be(HttpStatusCode.NoContent);
        invalida.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var json = JsonDocument.Parse(await cliente.GetStringAsync("/pessoal/historico"));
        json.RootElement.GetProperty("transacoes").EnumerateArray()
            .Single(t => t.GetProperty("descricao").GetString() == "Compra no debito Mercado Exemplo")
            .GetProperty("categoria").GetString().Should().Be("Lazer");
        json.RootElement.GetProperty("categorias").EnumerateArray().Select(c => c.GetString()).Should().Contain(["Lazer", "Sem categoria"]);
    }

    [Fact]
    public async Task O_historico_mostra_o_que_foi_importado_antes()
    {
        var cliente = Cliente("Pessoal");
        await cliente.PostAsync("/pessoal/extratos", Amostra());

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

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using HdsFinance.Api.Admin;
using HdsFinance.Application.Acesso;
using HdsFinance.Application.Admin;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Repositorios;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace HdsFinance.Api.Tests;

/// <summary>A área admin de ponta a ponta, com SQLite em memória no lugar do Postgres.</summary>
public sealed class AdminTestes(WebApplicationFactory<Program> fabrica) : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private const string EmailDoAdmin = "admin@exemplo.com";
    private const string Codigo = "123456";

    private readonly SqliteConnection _conexao = AbrirConexao();
    private readonly NotificadorFalso _notificador = new();
    private readonly EnvioFalso _envio = new();

    public void Dispose() => _conexao.Dispose();

    private static SqliteConnection AbrirConexao()
    {
        var conexao = new SqliteConnection("DataSource=:memory:");
        conexao.Open();
        return conexao;
    }

    private sealed class NotificadorFalso : INotificador
    {
        public List<MesDeReferencia> Enviados { get; } = [];

        public Task<ResultadoDoEnvio> EnviarAsync(MesDeReferencia mes, byte[] pdf, CancellationToken cancelamento = default)
        {
            Enviados.Add(mes);
            return Task.FromResult<ResultadoDoEnvio>(new ResultadoDoEnvio.Enviado());
        }
    }

    private sealed class EnvioFalso : IEnvioEmSegundoPlano
    {
        public List<string> Enviados { get; } = [];

        public void EnviarCodigo(string para, string codigo) => Enviados.Add(para);
    }

    private sealed class CodigoFixo : IGeradorDeCodigo
    {
        public string NovoCodigo() => Codigo;
    }

    private sealed record ImportacaoJson(int TransacoesNovas, int Duplicadas, string Fechamento);

    private sealed record MensagemJson(string Mensagem);

    private WebApplicationFactory<Program> Fabrica(bool comAdmin, int limite) => fabrica.WithWebHostBuilder(b =>
    {
        b.UseSetting("Admin:LimiteDeLoginPorMinuto", limite.ToString(System.Globalization.CultureInfo.InvariantCulture));
        if (!comAdmin)
        {
            return;
        }

        b.UseSetting("Admin:Email", EmailDoAdmin);
        b.UseSetting("ConnectionStrings:Banco", "Host=nao-usado");
        b.ConfigureTestServices(s =>
        {
            s.RemoveAll<DbContextOptions<BancoDoAdmin>>();
            s.RemoveAll<IDbContextOptionsConfiguration<BancoDoAdmin>>();
            s.AddDbContext<BancoDoAdmin>(o => o.UseSqlite(_conexao));
            s.AddSingleton<INotificador>(_notificador);
            s.AddSingleton<IEnvioEmSegundoPlano>(_envio);
            s.AddSingleton<IGeradorDeCodigo, CodigoFixo>();
        });
    });

    /// <summary>Cliente do front: manda o cabeçalho do admin e guarda os cookies.</summary>
    private HttpClient Cliente(bool comAdmin = true, int limite = 1000)
    {
        var cliente = Fabrica(comAdmin, limite).CreateClient();
        cliente.DefaultRequestHeaders.Add(RotasDoAdmin.CabecalhoDoAdmin, "1");
        return cliente;
    }

    private async Task<HttpClient> ClienteLogadoAsync(int limite = 1000)
    {
        var cliente = Cliente(limite: limite);
        (await cliente.PostAsJsonAsync("/admin/acesso/codigo", new { email = EmailDoAdmin })).EnsureSuccessStatusCode();
        (await cliente.PostAsJsonAsync("/admin/acesso/confirmar", new { codigo = Codigo })).EnsureSuccessStatusCode();
        return cliente;
    }

    private static MultipartFormDataContent Amostra() => new()
    {
        { new ByteArrayContent(File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "samples", "inter-extrato.ofx"))), "arquivo", "extrato.ofx" },
    };

    [Fact]
    public async Task Sem_login_as_rotas_do_admin_respondem_401()
    {
        var cliente = Cliente();

        (await cliente.GetAsync("/admin/historico")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await cliente.PostAsync("/admin/extratos", Amostra())).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await cliente.GetAsync("/admin/acesso/sessao")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task O_login_guarda_a_sessao_num_cookie_httponly()
    {
        var cliente = Cliente();
        await cliente.PostAsJsonAsync("/admin/acesso/codigo", new { email = EmailDoAdmin });

        var resposta = await cliente.PostAsJsonAsync("/admin/acesso/confirmar", new { codigo = Codigo });

        resposta.StatusCode.Should().Be(HttpStatusCode.NoContent);
        resposta.Headers.GetValues("Set-Cookie").Should().Contain(c =>
            c.StartsWith(RotasDoAdmin.CookieDaSessao + "=", StringComparison.Ordinal) && c.Contains("httponly", StringComparison.OrdinalIgnoreCase)
            && c.Contains("samesite=strict", StringComparison.OrdinalIgnoreCase)
            && c.Contains("path=/;", StringComparison.OrdinalIgnoreCase));
        (await resposta.Content.ReadAsStringAsync()).Should().BeEmpty();
        (await cliente.GetAsync("/admin/acesso/sessao")).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Outro_email_recebe_a_mesma_resposta_e_nenhum_codigo()
    {
        var resposta = await Cliente().PostAsJsonAsync("/admin/acesso/codigo", new { email = "curioso@exemplo.com" });

        resposta.StatusCode.Should().Be(HttpStatusCode.NoContent);
        _envio.Enviados.Should().BeEmpty();
    }

    [Fact]
    public async Task Codigo_errado_nao_abre_sessao()
    {
        var cliente = Cliente();
        await cliente.PostAsJsonAsync("/admin/acesso/codigo", new { email = EmailDoAdmin });

        (await cliente.PostAsJsonAsync("/admin/acesso/confirmar", new { codigo = "000000" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await cliente.GetAsync("/admin/historico")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Sem_o_cabecalho_do_admin_a_requisicao_e_recusada_mesmo_com_cookie()
    {
        var cliente = await ClienteLogadoAsync();
        cliente.DefaultRequestHeaders.Remove(RotasDoAdmin.CabecalhoDoAdmin);

        (await cliente.GetAsync("/admin/historico")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Sair_encerra_a_sessao()
    {
        var cliente = await ClienteLogadoAsync();

        await cliente.PostAsync("/admin/acesso/sair", null);

        (await cliente.GetAsync("/admin/historico")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Adicionar_extrato_guarda_no_historico_e_fecha_o_mes_completo()
    {
        var cliente = await ClienteLogadoAsync();

        var primeira = await (await cliente.PostAsync("/admin/extratos", Amostra())).Content.ReadFromJsonAsync<ImportacaoJson>();
        var segunda = await (await cliente.PostAsync("/admin/extratos", Amostra())).Content.ReadFromJsonAsync<ImportacaoJson>();

        primeira.Should().Be(new ImportacaoJson(3, 0, "Fechamento de 2026-10 enviado por e-mail."));
        segunda.Should().Be(new ImportacaoJson(0, 3, "Fechamento de 2026-10 já tinha sido enviado."));
        _notificador.Enviados.Should().ContainSingle();
    }

    [Fact]
    public async Task O_historico_mostra_o_que_foi_importado_antes()
    {
        var cliente = await ClienteLogadoAsync();
        await cliente.PostAsync("/admin/extratos", Amostra());

        using var json = JsonDocument.Parse(await cliente.GetStringAsync("/admin/historico"));

        json.RootElement.GetProperty("meses").GetArrayLength().Should().Be(1);
        json.RootElement.GetProperty("painel").GetProperty("mes").GetInt32().Should().Be(10);
        json.RootElement.GetProperty("saldo").GetProperty("valor").GetDecimal().Should().Be(2376.55m);
        json.RootElement.GetProperty("transacoes").GetArrayLength().Should().Be(3);
    }

    [Fact]
    public async Task Apaga_uma_transacao_com_os_dados_no_corpo_e_nunca_na_url()
    {
        var cliente = await ClienteLogadoAsync();
        await cliente.PostAsync("/admin/extratos", Amostra());
        var transacao = new { data = "2026-10-05", valor = -123.45m, descricao = "Compra no debito Mercado Exemplo" };

        var resposta = await cliente.PostAsJsonAsync("/admin/transacoes/apagar", transacao);
        var denovo = await cliente.PostAsJsonAsync("/admin/transacoes/apagar", transacao);

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
        denovo.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var json = JsonDocument.Parse(await cliente.GetStringAsync("/admin/historico"));
        json.RootElement.GetProperty("transacoes").GetArrayLength().Should().Be(2);
    }

    [Fact]
    public async Task Apaga_um_mes_inteiro_do_historico()
    {
        var cliente = await ClienteLogadoAsync();
        await cliente.PostAsync("/admin/extratos", Amostra());

        var resposta = await cliente.DeleteAsync("/admin/meses/2026-10");
        var invalido = await cliente.DeleteAsync("/admin/meses/outubro");

        (await resposta.Content.ReadFromJsonAsync<RemocaoJson>()).Should().Be(new RemocaoJson(3));
        invalido.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var json = JsonDocument.Parse(await cliente.GetStringAsync("/admin/historico"));
        json.RootElement.GetProperty("transacoes").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Gera_o_pdf_de_um_mes_do_historico()
    {
        var cliente = await ClienteLogadoAsync();
        await cliente.PostAsync("/admin/extratos", Amostra());

        var resposta = await cliente.GetAsync("/admin/relatorio?mes=2026-10");
        var semDados = await cliente.GetAsync("/admin/relatorio?mes=2026-03");

        resposta.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
        semDados.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Enviar_o_fechamento_de_novo_so_com_forcar()
    {
        var cliente = await ClienteLogadoAsync();
        await cliente.PostAsync("/admin/extratos", Amostra());

        var repetido = await cliente.PostAsync("/admin/fechamento?mes=2026-10", null);
        var forcado = await cliente.PostAsync("/admin/fechamento?mes=2026-10&forcar=true", null);

        repetido.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await forcado.Content.ReadFromJsonAsync<MensagemJson>())!.Mensagem.Should().Be("Fechamento de 2026-10 enviado por e-mail.");
        _notificador.Enviados.Should().HaveCount(2);
    }

    [Fact]
    public async Task Corrigir_a_categoria_vale_para_a_descricao_no_historico()
    {
        var cliente = await ClienteLogadoAsync();
        await cliente.PostAsync("/admin/extratos", Amostra());

        var resposta = await cliente.PutAsJsonAsync("/admin/categorias", new { descricao = "Compra no debito Mercado Exemplo", categoria = "Lazer" });
        var invalida = await cliente.PutAsJsonAsync("/admin/categorias", new { descricao = "Compra no debito Mercado Exemplo", categoria = "Inventada" });

        resposta.StatusCode.Should().Be(HttpStatusCode.NoContent);
        invalida.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var json = JsonDocument.Parse(await cliente.GetStringAsync("/admin/historico"));
        json.RootElement.GetProperty("transacoes").EnumerateArray()
            .Single(t => t.GetProperty("descricao").GetString() == "Compra no debito Mercado Exemplo")
            .GetProperty("categoria").GetString().Should().Be("Lazer");
    }

    [Fact]
    public async Task Com_o_admin_ligado_a_demonstracao_continua_sem_guardar_nada()
    {
        var cliente = await ClienteLogadoAsync();

        (await cliente.PostAsync("/demonstracao/resumo", Amostra())).StatusCode.Should().Be(HttpStatusCode.OK);

        using var json = JsonDocument.Parse(await cliente.GetStringAsync("/admin/historico"));
        json.RootElement.GetProperty("transacoes").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Sem_admin_configurado_as_rotas_do_admin_nao_existem()
    {
        (await Cliente(comAdmin: false).GetAsync("/admin/historico")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task As_rotas_de_email_da_demonstracao_nao_existem_mais()
    {
        var resposta = await Cliente(comAdmin: false).PostAsync("/demonstracao/email/codigo", new StringContent("{}"));

        resposta.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task O_limite_por_ip_vale_no_login_mas_nao_derruba_o_painel()
    {
        var cliente = await ClienteLogadoAsync(limite: 2);

        for (var i = 0; i < 5; i++)
        {
            (await cliente.GetAsync("/admin/historico")).StatusCode.Should().Be(HttpStatusCode.OK);
        }

        var anonimo = Cliente(limite: 1);
        await anonimo.PostAsJsonAsync("/admin/acesso/codigo", new { email = "a@exemplo.com" });
        (await anonimo.PostAsJsonAsync("/admin/acesso/codigo", new { email = "a@exemplo.com" }))
            .StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task Navegador_que_ja_entrou_nao_e_barrado_pelo_limite_por_ip()
    {
        var cliente = await ClienteLogadoAsync(limite: 2);
        await cliente.PostAsync("/admin/acesso/sair", null);

        for (var i = 0; i < 3; i++)
        {
            (await cliente.PostAsJsonAsync("/admin/acesso/codigo", new { email = EmailDoAdmin })).StatusCode.Should().Be(HttpStatusCode.NoContent);
        }
    }

    [Fact]
    public async Task Num_lote_o_extrato_pode_entrar_sem_mandar_o_fechamento()
    {
        var cliente = await ClienteLogadoAsync();

        (await cliente.PostAsync("/admin/extratos?fechar=false", Amostra())).EnsureSuccessStatusCode();

        _notificador.Enviados.Should().BeEmpty();
    }

    [Fact]
    public async Task Fatura_exige_sessao_e_recusa_arquivo_que_nao_e_fatura()
    {
        MultipartFormDataContent Arquivo() => new() { { new ByteArrayContent([1, 2, 3]), "arquivo", "fatura.pdf" } };

        (await Cliente().PostAsync("/admin/faturas", Arquivo())).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await (await ClienteLogadoAsync()).PostAsync("/admin/faturas", Arquivo())).StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task Muda_a_categoria_e_oculta_uma_transacao()
    {
        var cliente = await ClienteLogadoAsync();
        await cliente.PostAsync("/admin/extratos", Amostra());
        async Task<JsonElement> CompraAsync() => JsonDocument.Parse(await cliente.GetStringAsync("/admin/historico")).RootElement
            .GetProperty("transacoes").EnumerateArray().Single(t => t.GetProperty("valor").GetDecimal() == -123.45m);
        var chave = (await CompraAsync()).GetProperty("chave").GetString();

        (await cliente.PutAsJsonAsync("/admin/transacoes/categoria", new { chave, categoria = "Lazer" })).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await cliente.PutAsJsonAsync("/admin/transacoes/oculta", new { chave, oculta = true })).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await cliente.PutAsJsonAsync("/admin/transacoes/categoria", new { chave, categoria = "Inventada" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await cliente.PutAsJsonAsync("/admin/transacoes/oculta", new { chave = "x", oculta = true })).StatusCode.Should().Be(HttpStatusCode.NotFound);

        var compra = await CompraAsync();
        compra.GetProperty("categoria").GetString().Should().Be("Lazer");
        compra.GetProperty("oculta").GetBoolean().Should().BeTrue();
        using var json = JsonDocument.Parse(await cliente.GetStringAsync("/admin/historico"));
        json.RootElement.GetProperty("meses")[0].GetProperty("saidas").GetDecimal().Should().Be(0m);
    }

    [Fact]
    public async Task Extrato_e_fatura_do_nubank_entram_separados_sem_mandar_fechamento()
    {
        var cliente = await ClienteLogadoAsync();
        MultipartFormDataContent Arquivo(byte[] conteudo, string nome) => new() { { new ByteArrayContent(conteudo), "arquivo", nome } };
        var conta = File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "samples", "nubank-conta.csv"));

        (await cliente.PostAsync("/admin/extratos", Arquivo(conta, "conta.csv"))).StatusCode.Should().Be(HttpStatusCode.OK);
        (await cliente.PostAsync("/admin/faturas", Arquivo("date,title,amount\n2024-05-31,Uber,\"12,99\"\n"u8.ToArray(), "Nubank_2024-06-22.csv")))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        _notificador.Enviados.Should().BeEmpty();
        using var json = JsonDocument.Parse(await cliente.GetStringAsync("/admin/historico"));
        json.RootElement.GetProperty("transacoes").EnumerateArray().Should().OnlyContain(t => t.GetProperty("banco").GetString() == "Nubank");
        json.RootElement.GetProperty("faturas")[0].GetProperty("banco").GetString().Should().Be("Nubank");
        json.RootElement.GetProperty("saldo").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task A_demonstracao_nao_le_nubank()
    {
        var conta = File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "samples", "nubank-conta.csv"));
        var resposta = await Cliente().PostAsync("/demonstracao/resumo", new MultipartFormDataContent { { new ByteArrayContent(conta), "arquivo", "conta.csv" } });

        resposta.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }
}

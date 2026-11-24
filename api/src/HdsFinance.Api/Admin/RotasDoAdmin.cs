using HdsFinance.Api.Demonstracao;
using HdsFinance.Application.Acesso;
using HdsFinance.Application.Admin;
using HdsFinance.Application.Categorias;
using HdsFinance.Application.Extratos;
using HdsFinance.Domain;
using Microsoft.AspNetCore.Mvc;

namespace HdsFinance.Api.Admin;

/// <summary>Categorias são as que dá para escolher ao corrigir uma transação.</summary>
public sealed record HistoricoJson(
    IReadOnlyList<MesJson> Meses, PainelJson? Painel, IReadOnlyList<TransacaoJson> Transacoes, IReadOnlyList<string> Categorias);

public sealed record CorrecaoJson(string Descricao, string Categoria);

public sealed record ImportacaoJson(int TransacoesNovas, int Duplicadas, string Fechamento);

public sealed record PedidoDeCodigoJson(string Email);

public sealed record ConfirmacaoJson(string Codigo);

public sealed record RemocaoJson(int Apagadas);

/// <summary>Rotas da área admin: só o e-mail do admin entra, e os dados ficam no Postgres.</summary>
public static class RotasDoAdmin
{
    public const string CookieDaSessao = "hds_admin_sessao";
    public const string CookieDoDesafio = "hds_admin_desafio";

    /// <summary>
    /// Toda rota do admin exige este cabeçalho. Um site de fora não consegue mandá-lo sem passar pelo CORS,
    /// então o cookie sozinho não basta para agir em nome do admin.
    /// </summary>
    public const string CabecalhoDoAdmin = "X-Hds-Admin";

    public static void MapearAdmin(this IEndpointRouteBuilder app)
    {
        var admin = app.MapGroup("/admin")
            .DisableAntiforgery()
            .RequireRateLimiting(RotasDaDemonstracao.PoliticaDeLimite)
            .AddEndpointFilter(ExigirCabecalhoAsync);

        var acesso = admin.MapGroup("/acesso");
        acesso.MapPost("/codigo", PedirCodigoAsync);
        acesso.MapPost("/confirmar", Confirmar);
        acesso.MapPost("/sair", Sair);
        acesso.MapGet("/sessao", (HttpContext contexto, AcessoDoAdmin acessoDoAdmin) =>
            SessaoAberta(contexto, acessoDoAdmin) ? Results.NoContent() : NaoAutenticado());

        var protegidas = admin.MapGroup(string.Empty).AddEndpointFilter(ExigirSessaoAsync);
        protegidas.MapGet("/historico", HistoricoAsync);
        protegidas.MapPost("/extratos", AdicionarExtratoAsync)
            .WithMetadata(new RequestSizeLimitAttribute(RotasDaDemonstracao.TamanhoMaximoDoArquivo + 64 * 1024));
        protegidas.MapDelete("/transacoes", ApagarTransacaoAsync);
        protegidas.MapDelete("/meses/{mes}", ApagarMesAsync);
        protegidas.MapGet("/relatorio", RelatorioAsync);
        protegidas.MapPost("/fechamento", EnviarFechamentoAsync);
        protegidas.MapPut("/categorias", CorrigirCategoriaAsync);
    }

    private static async ValueTask<object?> ExigirCabecalhoAsync(EndpointFilterInvocationContext contexto, EndpointFilterDelegate proximo) =>
        contexto.HttpContext.Request.Headers.ContainsKey(CabecalhoDoAdmin)
            ? await proximo(contexto)
            : Results.Problem(title: "Requisição recusada", statusCode: StatusCodes.Status400BadRequest);

    private static async ValueTask<object?> ExigirSessaoAsync(EndpointFilterInvocationContext contexto, EndpointFilterDelegate proximo) =>
        SessaoAberta(contexto.HttpContext, contexto.HttpContext.RequestServices.GetRequiredService<AcessoDoAdmin>())
            ? await proximo(contexto)
            : NaoAutenticado();

    private static bool SessaoAberta(HttpContext contexto, AcessoDoAdmin acesso) =>
        contexto.Request.Cookies[CookieDaSessao] is { } sessao && acesso.SessaoValida(sessao);

    private static IResult NaoAutenticado() =>
        Results.Problem(title: "Não autenticado", detail: "Entre com o código enviado ao seu e-mail.", statusCode: StatusCodes.Status401Unauthorized);

    private static async Task<IResult> PedirCodigoAsync(
        PedidoDeCodigoJson pedido, AcessoDoAdmin acesso, HttpContext contexto, CancellationToken cancelamento)
    {
        var resultado = await acesso.PedirCodigoAsync(pedido.Email ?? string.Empty, cancelamento);
        if (resultado is ResultadoDoPedidoDeCodigo.CodigoEnviado enviado)
        {
            Gravar(contexto, CookieDoDesafio, enviado.Desafio, AcessoDoAdmin.ValidadeDoCodigo);
        }

        return RespostasHttp.De(resultado);
    }

    private static IResult Confirmar(ConfirmacaoJson confirmacao, AcessoDoAdmin acesso, HttpContext contexto)
    {
        var desafio = contexto.Request.Cookies[CookieDoDesafio] ?? string.Empty;
        var resultado = acesso.Confirmar(confirmacao.Codigo ?? string.Empty, desafio);
        if (resultado is ResultadoDaConfirmacao.Confirmado confirmado)
        {
            Apagar(contexto, CookieDoDesafio);
            Gravar(contexto, CookieDaSessao, confirmado.Sessao, AcessoDoAdmin.ValidadeDaSessao);
        }

        return RespostasHttp.De(resultado);
    }

    private static IResult Sair(HttpContext contexto)
    {
        Apagar(contexto, CookieDaSessao);
        return Results.NoContent();
    }

    private static void Gravar(HttpContext contexto, string nome, string valor, TimeSpan validade) =>
        contexto.Response.Cookies.Append(nome, valor, OpcoesDoCookie(contexto, validade));

    private static void Apagar(HttpContext contexto, string nome) =>
        contexto.Response.Cookies.Delete(nome, OpcoesDoCookie(contexto, TimeSpan.Zero));

    /// <summary>
    /// HttpOnly: o JavaScript da página nunca lê o token. Com front e api em domínios diferentes
    /// (Vercel e Render), o cookie precisa de SameSite=None, e aí ele só viaja por HTTPS.
    /// </summary>
    private static CookieOptions OpcoesDoCookie(HttpContext contexto, TimeSpan validade)
    {
        var entreSites = contexto.RequestServices.GetRequiredService<IConfiguration>().GetValue("Admin:CookieEntreSites", false);
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = entreSites || contexto.Request.IsHttps,
            SameSite = entreSites ? SameSiteMode.None : SameSiteMode.Lax,
            Path = "/admin",
            MaxAge = validade,
            IsEssential = true,
        };
    }

    private static async Task<IResult> HistoricoAsync(ConsultarHistorico consultar, Categorizador categorizador, CancellationToken cancelamento)
    {
        var historico = await consultar.ExecutarAsync(cancelamento);
        return Results.Ok(new HistoricoJson(
            historico.Meses.Select(JsonDoResumo.De).ToList(),
            historico.Painel is null ? null : JsonDoResumo.De(historico.Painel),
            historico.Transacoes.Select(JsonDoResumo.De).ToList(),
            categorizador.Categorias));
    }

    private static async Task<IResult> CorrigirCategoriaAsync(CorrecaoJson correcao, CorrigirCategoria corrigir, CancellationToken cancelamento) =>
        await corrigir.ExecutarAsync(correcao.Descricao ?? string.Empty, correcao.Categoria ?? string.Empty, cancelamento) switch
        {
            ResultadoDaCorrecao.Corrigida => Results.NoContent(),
            ResultadoDaCorrecao.CategoriaInvalida => Results.Problem(
                title: "Categoria inválida", detail: "Escolha uma das categorias da lista.", statusCode: StatusCodes.Status400BadRequest),
            _ => Results.Problem(title: "Descrição vazia", statusCode: StatusCodes.Status400BadRequest),
        };

    /// <summary>Importa, anota a cobertura e fecha o mês, se ele ficou completo.</summary>
    private static async Task<IResult> AdicionarExtratoAsync(
        HttpRequest requisicao, ProcessarExtratoRecebido processar, CancellationToken cancelamento)
    {
        var (arquivo, erro) = await RotasDaDemonstracao.LerArquivoAsync(requisicao, cancelamento);
        if (arquivo is null)
        {
            return erro!;
        }

        await using var conteudo = arquivo.Value.Conteudo.OpenReadStream();
        var resultado = await processar.ExecutarAsync(conteudo, arquivo.Value.Formato, cancelamento);
        return resultado.Importacao is ResultadoDaImportacao.Importado importado
            ? Results.Ok(new ImportacaoJson(importado.Novas, importado.Duplicadas, TextoDoFechamento.De(resultado.Fechamento)))
            : RespostasHttp.De(new ResultadoDoResumo.NaoImportado(resultado.Importacao));
    }

    private static async Task<IResult> ApagarTransacaoAsync(
        DateOnly data, decimal valor, string descricao, ApagarDados apagar, CancellationToken cancelamento) =>
        RespostasHttp.De(await apagar.TransacaoAsync(data, valor, descricao, cancelamento));

    private static async Task<IResult> ApagarMesAsync(string mes, ApagarDados apagar, CancellationToken cancelamento) =>
        MesDeReferencia.TentarLer(mes) is { } pedido
            ? RespostasHttp.De(await apagar.MesAsync(pedido, cancelamento))
            : RespostasHttp.MesInvalido();

    private static async Task<IResult> RelatorioAsync(FecharMes fechar, string? mes, CancellationToken cancelamento)
    {
        if (LerMes(mes) is not (true, var pedido))
        {
            return RespostasHttp.MesInvalido();
        }

        return RespostasHttp.De(await fechar.GerarAsync(pedido, cancelamento));
    }

    private static async Task<IResult> EnviarFechamentoAsync(FecharMes fechar, string? mes, bool? forcar, CancellationToken cancelamento)
    {
        if (LerMes(mes) is not (true, var pedido))
        {
            return RespostasHttp.MesInvalido();
        }

        // Sem mês pedido, vale o mais recente do histórico.
        var alvo = pedido ?? (await fechar.MesesAsync(cancelamento)).LastOrDefault()?.Mes;
        return alvo is { } escolhido
            ? RespostasHttp.De(await fechar.EnviarAsync(escolhido, forcar ?? false, cancelamento))
            : RespostasHttp.De(new ResultadoDoFechamento.SemDados(default));
    }

    private static (bool Valido, MesDeReferencia? Mes) LerMes(string? texto) =>
        texto is null ? (true, null) : MesDeReferencia.TentarLer(texto) is { } mes ? (true, mes) : (false, null);
}

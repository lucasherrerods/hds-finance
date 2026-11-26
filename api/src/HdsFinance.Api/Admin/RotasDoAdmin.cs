using System.Threading.RateLimiting;
using HdsFinance.Api.Demonstracao;
using HdsFinance.Application.Acesso;
using HdsFinance.Application.Admin;
using HdsFinance.Application.Assistente;
using HdsFinance.Application.Categorias;
using HdsFinance.Application.Extratos;
using HdsFinance.Domain;
using Microsoft.AspNetCore.Mvc;

namespace HdsFinance.Api.Admin;

/// <summary>Categorias são as que dá para escolher ao corrigir uma transação.</summary>
public sealed record HistoricoJson(
    IReadOnlyList<MesJson> Meses, PainelJson? Painel, IReadOnlyList<TransacaoJson> Transacoes, IReadOnlyList<string> Categorias,
    SaldoJson? Saldo, IReadOnlyList<FaturaJson> Faturas, IReadOnlyList<GrupoDeCategoria> Grupos);

public sealed record FaturaJson(DateOnly Vencimento, decimal? Total, decimal Gasto, bool? Paga, IReadOnlyList<TransacaoJson> Compras, string Banco,
    IReadOnlyList<GastoJson> GastosPorCategoria);

public sealed record SaldoJson(decimal Valor, DateOnly Em, bool Informado, decimal? AntesDoHistorico);

public sealed record CorrecaoJson(string Descricao, string Categoria);

public sealed record ImportacaoJson(int TransacoesNovas, int Duplicadas, string Fechamento);

public sealed record PedidoDeCodigoJson(string Email);

public sealed record ConfirmacaoJson(string Codigo);

public sealed record CategoriaDaTransacaoJson(string Chave, string? Categoria);

public sealed record OcultaJson(string Chave, bool Oculta);

public sealed record RemocaoJson(int Apagadas);

public sealed record AlertaJson(string Tipo, string Assunto, decimal Valor, decimal? Referencia, string Texto);

/// <summary>Comentário nulo quando a IA não está configurada ou não respondeu; os alertas vêm sempre.</summary>
public sealed record AnaliseJson(int Ano, int Mes, string? Comentario, IReadOnlyList<AlertaJson> Alertas);

public sealed record PerguntaJson(string Pergunta);

public sealed record RespostaJson(string Resposta);

public sealed record TransacaoParaApagarJson(DateOnly Data, decimal Valor, string Descricao);

/// <summary>Rotas da área admin: só o e-mail do admin entra, e os dados ficam no Postgres.</summary>
public static class RotasDoAdmin
{
    public const string CookieDaSessao = "hds_admin_sessao";
    public const string CookieDoDesafio = "hds_admin_desafio";
    public const string CookieDoDispositivo = "hds_admin_dispositivo";
    public const string PoliticaDoLogin = "login";

    /// <summary>
    /// Toda rota do admin exige este cabeçalho. Um site de fora não consegue mandá-lo sem passar pelo CORS,
    /// então o cookie sozinho não basta para agir em nome do admin.
    /// </summary>
    public const string CabecalhoDoAdmin = "X-Hds-Admin";

    public static void MapearAdmin(this IEndpointRouteBuilder app)
    {
        var admin = app.MapGroup("/admin")
            .DisableAntiforgery()
            .AddEndpointFilter(ExigirCabecalhoAsync);

        var acesso = admin.MapGroup("/acesso");
        acesso.MapPost("/codigo", PedirCodigo).RequireRateLimiting(PoliticaDoLogin);
        acesso.MapPost("/confirmar", Confirmar).RequireRateLimiting(PoliticaDoLogin);
        acesso.MapPost("/sair", Sair);
        acesso.MapGet("/sessao", (HttpContext contexto, AcessoDoAdmin acessoDoAdmin) =>
            SessaoAberta(contexto, acessoDoAdmin) ? Results.NoContent() : NaoAutenticado());

        var protegidas = admin.MapGroup(string.Empty).AddEndpointFilter(ExigirSessaoAsync);
        protegidas.MapGet("/historico", HistoricoAsync);
        protegidas.MapPost("/extratos", AdicionarExtratoAsync)
            .WithMetadata(new RequestSizeLimitAttribute(RotasDaDemonstracao.TamanhoMaximoDoArquivo + 64 * 1024));
        protegidas.MapPost("/faturas", AdicionarFaturaAsync)
            .WithMetadata(new RequestSizeLimitAttribute(RotasDaDemonstracao.TamanhoMaximoDoArquivo + 64 * 1024));
        // POST com corpo: descrição e valor na URL iriam parar nos logs de acesso.
        protegidas.MapPost("/transacoes/apagar", ApagarTransacaoAsync);
        protegidas.MapPut("/transacoes/categoria", MudarCategoriaAsync);
        protegidas.MapPut("/transacoes/oculta", OcultarAsync);
        protegidas.MapDelete("/meses/{mes}", ApagarMesAsync);
        protegidas.MapGet("/relatorio", RelatorioAsync);
        protegidas.MapPost("/fechamento", EnviarFechamentoAsync);
        protegidas.MapPut("/categorias", CorrigirCategoriaAsync);

        var assistente = protegidas.MapGroup("/assistente");
        assistente.MapGet("/analise", AnaliseAsync);
        assistente.MapGet("/sugestoes", SugestoesAsync);
        assistente.MapPost("/pergunta", PerguntaAsync);
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

    private static IResult PedirCodigo(PedidoDeCodigoJson pedido, AcessoDoAdmin acesso, HttpContext contexto)
    {
        var resultado = acesso.PedirCodigo(pedido.Email ?? string.Empty, Origem(contexto), contexto.Request.Cookies[CookieDoDispositivo]);
        if (resultado is ResultadoDoPedidoDeCodigo.CodigoEnviado enviado)
        {
            Gravar(contexto, CookieDoDesafio, enviado.Desafio, AcessoDoAdmin.ValidadeDoCodigo);
        }

        return RespostasHttp.De(resultado);
    }

    private static string Origem(HttpContext contexto) => contexto.Connection.RemoteIpAddress?.ToString() ?? "desconhecido";

    /// <summary>Por IP, menos para o navegador que já entrou: ele tem o limite próprio do caso de uso.</summary>
    public static RateLimitPartition<string> LimiteDoLogin(HttpContext contexto, int porMinuto) =>
        contexto.RequestServices.GetService<AcessoDoAdmin>()?.DispositivoConhecido(contexto.Request.Cookies[CookieDoDispositivo]) == true
            ? RateLimitPartition.GetNoLimiter("dispositivo")
            : RateLimitPartition.GetFixedWindowLimiter(Origem(contexto), _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = porMinuto,
                Window = TimeSpan.FromMinutes(1),
            });

    private static IResult Confirmar(ConfirmacaoJson confirmacao, AcessoDoAdmin acesso, HttpContext contexto)
    {
        var desafio = contexto.Request.Cookies[CookieDoDesafio] ?? string.Empty;
        var resultado = acesso.Confirmar(confirmacao.Codigo ?? string.Empty, desafio);
        if (resultado is ResultadoDaConfirmacao.Confirmado confirmado)
        {
            Apagar(contexto, CookieDoDesafio);
            Gravar(contexto, CookieDoDispositivo, confirmado.Dispositivo, AcessoDoAdmin.ValidadeDoDispositivo);
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
    /// HttpOnly: o JavaScript da página nunca lê o token. Em produção a Vercel repassa /api para cá,
    /// então o cookie é do próprio site e pode ser Strict. Path "/" porque o navegador vê /api/admin.
    /// </summary>
    private static CookieOptions OpcoesDoCookie(HttpContext contexto, TimeSpan validade) => new()
    {
        HttpOnly = true,
        Secure = contexto.Request.IsHttps,
        SameSite = SameSiteMode.Strict,
        Path = "/",
        MaxAge = validade,
        IsEssential = true,
    };

    private static async Task<IResult> HistoricoAsync(ConsultarHistorico consultar, Categorizador categorizador, CancellationToken cancelamento)
    {
        var historico = await consultar.ExecutarAsync(cancelamento);
        return Results.Ok(new HistoricoJson(
            historico.Meses.Select(JsonDoResumo.De).ToList(),
            historico.Painel is null ? null : JsonDoResumo.De(historico.Painel),
            historico.Transacoes.Select(JsonDoResumo.De).ToList(),
            categorizador.Categorias,
            historico.Saldo is { } s ? new SaldoJson(s.Valor, s.Em, s.Informado, s.AntesDoHistorico) : null,
            historico.Faturas.Select(f => new FaturaJson(f.Vencimento, f.Total, f.Gasto, f.Paga, f.Compras.Select(JsonDoResumo.De).ToList(), f.Banco.ToString(),
                f.GastosPorCategoria.Select(GastoJson.De).ToList())).ToList(),
            GruposDeCategoria.Todos));
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
        HttpRequest requisicao, ProcessarExtratoRecebido processar, bool? fechar, CancellationToken cancelamento)
    {
        var (arquivo, erro) = await RotasDaDemonstracao.LerArquivoAsync(requisicao, cancelamento);
        if (arquivo is null)
        {
            return erro!;
        }

        await using var conteudo = arquivo.Value.Conteudo.OpenReadStream();
        var resultado = await processar.ExecutarAsync(conteudo, arquivo.Value.Formato, cancelamento, fechar ?? true);
        return resultado.Importacao is ResultadoDaImportacao.Importado importado
            ? Results.Ok(new ImportacaoJson(importado.Novas, importado.Duplicadas, TextoDoFechamento.De(resultado.Fechamento)))
            : RespostasHttp.De(new ResultadoDoResumo.NaoImportado(resultado.Importacao));
    }

    /// <summary>A senha vem no formulário, abre o PDF em memória e some com a requisição.</summary>
    private static async Task<IResult> AdicionarFaturaAsync(HttpRequest requisicao, ImportarFatura importar, CancellationToken cancelamento)
    {
        var (arquivo, erro) = await RotasDaDemonstracao.LerUploadAsync(requisicao, cancelamento);
        if (arquivo is null)
        {
            return erro!;
        }

        using var conteudo = new MemoryStream();
        await arquivo.CopyToAsync(conteudo, cancelamento);
        var senha = (await requisicao.ReadFormAsync(cancelamento))["senha"].ToString();
        return RespostasHttp.De(await importar.ExecutarAsync(conteudo.ToArray(), arquivo.FileName, senha, cancelamento));
    }

    private static async Task<IResult> ApagarTransacaoAsync(
        TransacaoParaApagarJson transacao, ApagarDados apagar, CancellationToken cancelamento) =>
        RespostasHttp.De(await apagar.TransacaoAsync(transacao.Data, transacao.Valor, transacao.Descricao ?? string.Empty, cancelamento));

    private static async Task<IResult> MudarCategoriaAsync(CategoriaDaTransacaoJson pedido, AjustarTransacao ajustar, CancellationToken cancelamento) =>
        RespostasHttp.De(await ajustar.CategoriaAsync(pedido.Chave ?? string.Empty, pedido.Categoria, cancelamento));

    private static async Task<IResult> OcultarAsync(OcultaJson pedido, AjustarTransacao ajustar, CancellationToken cancelamento) =>
        RespostasHttp.De(await ajustar.OcultarAsync(pedido.Chave ?? string.Empty, pedido.Oculta, cancelamento));

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

    private static async Task<IResult> AnaliseAsync(FecharMes fechar, string? mes, CancellationToken cancelamento)
    {
        if (LerMes(mes) is not (true, var pedido))
        {
            return RespostasHttp.MesInvalido();
        }

        return await fechar.AnalisarAsync(pedido, cancelamento) is { } analise
            ? Results.Ok(new AnaliseJson(analise.Mes.Ano, analise.Mes.Mes, analise.Comentario,
                analise.Alertas.Select(a => new AlertaJson(a.Tipo.ToString(), a.Assunto, a.Valor, a.Referencia, a.Texto)).ToList()))
            : Results.NoContent();
    }

    /// <summary>Aceitar uma sugestão é o mesmo PUT /categorias de quando o admin corrige na mão.</summary>
    private static async Task<IResult> SugestoesAsync(FecharMes fechar, SugerirCategorias sugerir, CancellationToken cancelamento) =>
        Results.Ok(await sugerir.ExecutarAsync(await fechar.TransacoesAsync(cancelamento), cancelamento));

    private static async Task<IResult> PerguntaAsync(PerguntaJson pedido, FecharMes fechar, ResponderPergunta responder, CancellationToken cancelamento) =>
        Results.Ok(new RespostaJson(await responder.ExecutarAsync(await fechar.MesesAsync(cancelamento), pedido.Pergunta ?? string.Empty, cancelamento)));

    private static (bool Valido, MesDeReferencia? Mes) LerMes(string? texto) =>
        texto is null ? (true, null) : MesDeReferencia.TentarLer(texto) is { } mes ? (true, mes) : (false, null);
}

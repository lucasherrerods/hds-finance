using System.Threading.RateLimiting;
using HdsFinance.Application.EmailDaDemo;
using HdsFinance.Application.Extratos;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;

namespace HdsFinance.Api.Demonstracao;

public static class RotasDaDemonstracao
{
    public const long TamanhoMaximoDoArquivo = 2 * 1024 * 1024;
    private const string PoliticaDeLimite = "demonstracao";

    public static IServiceCollection AdicionarLimitesDaDemonstracao(this IServiceCollection services, IConfiguration configuracao)
    {
        // O buffer em memória cobre o limite inteiro, então o upload nunca vira arquivo temporário em disco.
        services.Configure<FormOptions>(o =>
        {
            o.MultipartBodyLengthLimit = TamanhoMaximoDoArquivo;
            o.MemoryBufferThreshold = (int)TamanhoMaximoDoArquivo + 64 * 1024;
        });

        var limitePorMinuto = configuracao.GetValue("Demonstracao:LimiteDeRequisicoesPorMinuto", 10);
        services.AddRateLimiter(o =>
        {
            o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            o.AddPolicy(PoliticaDeLimite, contexto => RateLimitPartition.GetFixedWindowLimiter(
                contexto.Connection.RemoteIpAddress?.ToString() ?? "desconhecido",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = limitePorMinuto, Window = TimeSpan.FromMinutes(1) }));
        });

        return services;
    }

    /// <summary>O envio para qualquer e-mail só existe na demonstração; no modo pessoal o fechamento vai para o dono.</summary>
    public static void MapearDemonstracao(this IEndpointRouteBuilder app, bool comEmail)
    {
        var demonstracao = app.MapGroup("/demonstracao")
            .DisableAntiforgery()
            .RequireRateLimiting(PoliticaDeLimite)
            .WithMetadata(new RequestSizeLimitAttribute(TamanhoMaximoDoArquivo + 64 * 1024));

        demonstracao.MapPost("/resumo", ResumirAsync);
        demonstracao.MapPost("/relatorio", RelatorioAsync);
        if (!comEmail)
        {
            return;
        }

        demonstracao.MapPost("/email/codigo", PedirCodigoAsync);
        demonstracao.MapPost("/email/confirmar", Confirmar);
        demonstracao.MapPost("/relatorio/email", RelatorioPorEmailAsync);
    }

    private static async Task<IResult> ResumirAsync(HttpRequest requisicao, ResumirExtrato resumir, CancellationToken cancelamento)
    {
        var (arquivo, erro) = await LerArquivoAsync(requisicao, cancelamento);
        if (arquivo is null)
        {
            return erro!;
        }

        await using var conteudo = arquivo.Value.Conteudo.OpenReadStream();
        return RespostasHttp.De(await resumir.ExecutarAsync(conteudo, arquivo.Value.Formato, cancelamento));
    }

    private static async Task<IResult> RelatorioAsync(
        HttpRequest requisicao, ResumirExtrato resumir, GerarRelatorio gerar, string? mes, CancellationToken cancelamento)
    {
        var pedido = mes is null ? null : MesDeReferencia.TentarLer(mes);
        if (mes is not null && pedido is null)
        {
            return RespostasHttp.MesInvalido();
        }

        var (arquivo, erro) = await LerArquivoAsync(requisicao, cancelamento);
        if (arquivo is null)
        {
            return erro!;
        }

        await using var conteudo = arquivo.Value.Conteudo.OpenReadStream();
        var resumo = await resumir.ExecutarAsync(conteudo, arquivo.Value.Formato, cancelamento);
        return resumo is ResultadoDoResumo.Resumido resumido
            ? RespostasHttp.De(gerar.Executar(resumido.Meses, pedido))
            : RespostasHttp.De(resumo);
    }

    public sealed record PedidoDeCodigo(string Email);

    public sealed record PedidoDeConfirmacao(string Email, string Codigo, string Desafio);

    private static async Task<IResult> PedirCodigoAsync(PedidoDeCodigo pedido, ConfirmacaoDeEmail confirmacao, CancellationToken cancelamento) =>
        RespostasHttp.De(await confirmacao.PedirCodigoAsync(pedido.Email ?? string.Empty, cancelamento));

    private static IResult Confirmar(PedidoDeConfirmacao pedido, ConfirmacaoDeEmail confirmacao) =>
        RespostasHttp.De(confirmacao.Confirmar(pedido.Email ?? string.Empty, pedido.Codigo ?? string.Empty, pedido.Desafio ?? string.Empty));

    private static async Task<IResult> RelatorioPorEmailAsync(
        HttpRequest requisicao, EnviarRelatorioDaDemo enviar, string? mes, CancellationToken cancelamento)
    {
        var pedido = mes is null ? null : MesDeReferencia.TentarLer(mes);
        if (mes is not null && pedido is null)
        {
            return RespostasHttp.MesInvalido();
        }

        var (arquivo, erro) = await LerArquivoAsync(requisicao, cancelamento);
        if (arquivo is null)
        {
            return erro!;
        }

        var formulario = await requisicao.ReadFormAsync(cancelamento);
        await using var conteudo = arquivo.Value.Conteudo.OpenReadStream();
        return RespostasHttp.De(await enviar.ExecutarAsync(
            conteudo, arquivo.Value.Formato, formulario["email"].ToString(), formulario["token"].ToString(), pedido, cancelamento));
    }

    /// <summary>Lê o campo "arquivo" do formulário e confere tamanho e formato.</summary>
    internal static async Task<((IFormFile Conteudo, FormatoDeExtrato Formato)? Arquivo, IResult? Erro)> LerArquivoAsync(
        HttpRequest requisicao, CancellationToken cancelamento)
    {
        IFormFile? arquivo;
        try
        {
            arquivo = (await requisicao.ReadFormAsync(cancelamento)).Files.GetFile("arquivo");
        }
        catch (InvalidDataException)
        {
            return (null, RespostasHttp.ArquivoGrandeDemais());
        }

        if (arquivo is null)
        {
            return (null, RespostasHttp.ArquivoAusente());
        }

        if (arquivo.Length > TamanhoMaximoDoArquivo)
        {
            return (null, RespostasHttp.ArquivoGrandeDemais());
        }

        if (FormatosDeExtrato.PeloNomeDoArquivo(arquivo.FileName) is not { } formato)
        {
            return (null, RespostasHttp.FormatoNaoSuportado());
        }

        return ((arquivo, formato), null);
    }
}

using System.Globalization;
using System.Threading.RateLimiting;
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

    public static IServiceCollection AdicionarDemonstracao(this IServiceCollection services, IConfiguration configuracao)
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

    public static void MapearDemonstracao(this IEndpointRouteBuilder app)
    {
        var demonstracao = app.MapGroup("/demonstracao")
            .DisableAntiforgery()
            .RequireRateLimiting(PoliticaDeLimite)
            .WithMetadata(new RequestSizeLimitAttribute(TamanhoMaximoDoArquivo + 64 * 1024));

        demonstracao.MapPost("/resumo", ResumirAsync);
        demonstracao.MapPost("/relatorio", RelatorioAsync);
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
        MesDeReferencia? pedido = null;
        if (mes is not null)
        {
            if (!DateOnly.TryParseExact(mes, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var data))
            {
                return RespostasHttp.MesInvalido();
            }

            pedido = new MesDeReferencia(data.Year, data.Month);
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

    /// <summary>Lê o campo "arquivo" do formulário e confere tamanho e formato.</summary>
    private static async Task<((IFormFile Conteudo, FormatoDeExtrato Formato)? Arquivo, IResult? Erro)> LerArquivoAsync(
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

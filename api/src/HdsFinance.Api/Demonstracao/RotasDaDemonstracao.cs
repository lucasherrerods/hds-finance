using System.Threading.RateLimiting;
using HdsFinance.Application.Extratos;
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
        app.MapPost("/demonstracao/resumo", ResumirAsync)
            .DisableAntiforgery()
            .RequireRateLimiting(PoliticaDeLimite)
            .WithMetadata(new RequestSizeLimitAttribute(TamanhoMaximoDoArquivo + 64 * 1024));
    }

    private static async Task<IResult> ResumirAsync(HttpRequest requisicao, ResumirExtrato resumir, CancellationToken cancelamento)
    {
        IFormFile? arquivo;
        try
        {
            arquivo = (await requisicao.ReadFormAsync(cancelamento)).Files.GetFile("arquivo");
        }
        catch (InvalidDataException)
        {
            return RespostasHttp.ArquivoGrandeDemais();
        }

        if (arquivo is null)
        {
            return RespostasHttp.ArquivoAusente();
        }

        if (arquivo.Length > TamanhoMaximoDoArquivo)
        {
            return RespostasHttp.ArquivoGrandeDemais();
        }

        if (FormatosDeExtrato.PeloNomeDoArquivo(arquivo.FileName) is not { } formato)
        {
            return RespostasHttp.FormatoNaoSuportado();
        }

        await using var conteudo = arquivo.OpenReadStream();
        return RespostasHttp.De(await resumir.ExecutarAsync(conteudo, formato, cancelamento));
    }
}

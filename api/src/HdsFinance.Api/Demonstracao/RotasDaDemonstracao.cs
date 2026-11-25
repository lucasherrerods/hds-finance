using System.Text.Json;
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

    /// <summary>O que cabe no formulário além do arquivo: os ajustes e os cabeçalhos das partes.</summary>
    private const int FolgaDoFormulario = 1024 * 1024;

    private const string PoliticaDeLimite = "demonstracao";

    public static IServiceCollection AdicionarLimitesDaDemonstracao(this IServiceCollection services, IConfiguration configuracao)
    {
        // O buffer em memória cobre o limite inteiro, então o upload nunca vira arquivo temporário em disco.
        services.Configure<FormOptions>(o =>
        {
            o.MultipartBodyLengthLimit = TamanhoMaximoDoArquivo;
            o.MemoryBufferThreshold = (int)TamanhoMaximoDoArquivo + FolgaDoFormulario;
            o.ValueLengthLimit = FolgaDoFormulario;
        });

        var limitePorMinuto = configuracao.GetValue("Demonstracao:LimiteDeRequisicoesPorMinuto", 30);
        var limiteDoLogin = configuracao.GetValue("Admin:LimiteDeLoginPorMinuto", 10);
        services.AddRateLimiter(o =>
        {
            o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            o.AddPolicy(PoliticaDeLimite, contexto => RateLimitPartition.GetFixedWindowLimiter(
                contexto.Connection.RemoteIpAddress?.ToString() ?? "desconhecido",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = limitePorMinuto, Window = TimeSpan.FromMinutes(1) }));
            o.AddPolicy(Admin.RotasDoAdmin.PoliticaDoLogin, contexto => Admin.RotasDoAdmin.LimiteDoLogin(contexto, limiteDoLogin));
        });

        return services;
    }

    /// <summary>A demonstração só resume e gera o PDF: nada é guardado nem enviado por e-mail.</summary>
    public static void MapearDemonstracao(this IEndpointRouteBuilder app)
    {
        var demonstracao = app.MapGroup("/demonstracao")
            .DisableAntiforgery()
            .RequireRateLimiting(PoliticaDeLimite)
            .WithMetadata(new RequestSizeLimitAttribute(TamanhoMaximoDoArquivo + FolgaDoFormulario));

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

        if (LerAjustes(requisicao) is not { } ajustes)
        {
            return RespostasHttp.AjusteInvalido();
        }

        await using var conteudo = arquivo.Value.Conteudo.OpenReadStream();
        return RespostasHttp.De(await resumir.ExecutarAsync(conteudo, arquivo.Value.Formato, ajustes, cancelamento));
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

        if (LerAjustes(requisicao) is not { } ajustes)
        {
            return RespostasHttp.AjusteInvalido();
        }

        await using var conteudo = arquivo.Value.Conteudo.OpenReadStream();
        var resumo = await resumir.ExecutarAsync(conteudo, arquivo.Value.Formato, ajustes, cancelamento);
        return resumo is ResultadoDoResumo.Resumido resumido
            ? RespostasHttp.De(gerar.Executar(resumido.Meses, pedido))
            : RespostasHttp.De(resumo);
    }

    /// <summary>O campo "ajustes" é opcional. Nulo quando veio e não dá para ler. Só depois de o formulário ter sido lido.</summary>
    private static IReadOnlyList<AjusteDoExtrato>? LerAjustes(HttpRequest requisicao)
    {
        var texto = requisicao.Form["ajustes"].ToString();
        if (texto.Length == 0)
        {
            return [];
        }

        try
        {
            var ajustes = JsonSerializer.Deserialize<List<AjusteDoExtrato?>>(texto, JsonSerializerOptions.Web);
            return ajustes is null || ajustes.Any(a => string.IsNullOrEmpty(a?.Chave)) ? null : ajustes.OfType<AjusteDoExtrato>().ToList();
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>Lê o campo "arquivo" do formulário e confere tamanho e formato.</summary>
    internal static async Task<((IFormFile Conteudo, FormatoDeExtrato Formato)? Arquivo, IResult? Erro)> LerArquivoAsync(
        HttpRequest requisicao, CancellationToken cancelamento)
    {
        var (arquivo, erro) = await LerUploadAsync(requisicao, cancelamento);
        if (arquivo is null)
        {
            return (null, erro);
        }

        return FormatosDeExtrato.PeloNomeDoArquivo(arquivo.FileName) is { } formato
            ? ((arquivo, formato), null)
            : (null, RespostasHttp.FormatoNaoSuportado());
    }

    internal static async Task<(IFormFile? Arquivo, IResult? Erro)> LerUploadAsync(HttpRequest requisicao, CancellationToken cancelamento)
    {
        try
        {
            var arquivo = (await requisicao.ReadFormAsync(cancelamento)).Files.GetFile("arquivo");
            return arquivo is null ? (null, RespostasHttp.ArquivoAusente())
                : arquivo.Length > TamanhoMaximoDoArquivo ? (null, RespostasHttp.ArquivoGrandeDemais())
                : (arquivo, null);
        }
        catch (InvalidDataException)
        {
            return (null, RespostasHttp.ArquivoGrandeDemais());
        }
    }
}

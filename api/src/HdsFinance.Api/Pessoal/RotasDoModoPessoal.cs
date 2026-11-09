using HdsFinance.Api.Demonstracao;
using HdsFinance.Application.Categorias;
using HdsFinance.Application.Extratos;
using HdsFinance.Application.ModoPessoal;
using HdsFinance.Domain;

namespace HdsFinance.Api.Pessoal;

/// <summary>Categorias são as que dá para escolher ao corrigir uma transação.</summary>
public sealed record HistoricoJson(
    IReadOnlyList<MesJson> Meses, PainelJson? Painel, IReadOnlyList<TransacaoJson> Transacoes, IReadOnlyList<string> Categorias);

public sealed record CorrecaoJson(string Descricao, string Categoria);

public sealed record ImportacaoJson(int TransacoesNovas, int Duplicadas, string Fechamento);

/// <summary>Rotas que só existem no modo pessoal, rodando na máquina do dono.</summary>
public static class RotasDoModoPessoal
{
    public static void MapearModoPessoal(this IEndpointRouteBuilder app)
    {
        var pessoal = app.MapGroup("/pessoal");
        pessoal.MapGet("/historico", HistoricoAsync);
        pessoal.MapPost("/extratos", AdicionarExtratoAsync).DisableAntiforgery();
        pessoal.MapGet("/relatorio", RelatorioAsync);
        pessoal.MapPost("/fechamento", EnviarFechamentoAsync);
        pessoal.MapPut("/categorias", CorrigirCategoriaAsync);
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

    /// <summary>O mesmo caminho do Worker: importa, anota a cobertura e fecha o mês, se ele ficou completo.</summary>
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

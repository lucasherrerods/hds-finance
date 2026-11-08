using HdsFinance.Application.Extratos;

namespace HdsFinance.Api.Demonstracao;

public sealed record MesJson(
    int Ano,
    int Mes,
    decimal Entradas,
    decimal Saidas,
    decimal Resultado,
    decimal InvestimentosETransferencias,
    decimal? SaldoInicial,
    decimal? SaldoFinal);

public sealed record ResumoDoExtratoJson(int TransacoesNovas, int Duplicadas, IReadOnlyList<MesJson> Meses);

/// <summary>Único lugar que traduz os resultados dos casos de uso em respostas HTTP.</summary>
public static class RespostasHttp
{
    public static IResult De(ResultadoDoResumo resultado) => resultado switch
    {
        ResultadoDoResumo.Resumido r => Results.Ok(new ResumoDoExtratoJson(
            r.Importacao.Novas,
            r.Importacao.Duplicadas,
            r.Meses.Select(m => new MesJson(
                m.Mes.Ano, m.Mes.Mes, m.Entradas, m.Saidas, m.Resultado,
                m.InvestimentosETransferencias, m.SaldoInicial, m.SaldoFinal)).ToList())),
        ResultadoDoResumo.NaoImportado { Motivo: ResultadoDaImportacao.ArquivoInvalido invalido } => Results.Problem(
            title: "Arquivo inválido",
            detail: invalido.Motivo,
            statusCode: StatusCodes.Status422UnprocessableEntity,
            extensions: new Dictionary<string, object?> { ["linha"] = invalido.Linha }),
        ResultadoDoResumo.NaoImportado { Motivo: ResultadoDaImportacao.FormatoNaoSuportado } => FormatoNaoSuportado(),
        _ => Results.Problem(statusCode: StatusCodes.Status500InternalServerError),
    };

    public static IResult FormatoNaoSuportado() => Results.Problem(
        title: "Formato não suportado",
        detail: "Envie um extrato .ofx ou .csv do Inter.",
        statusCode: StatusCodes.Status415UnsupportedMediaType);

    public static IResult ArquivoAusente() => Results.Problem(
        title: "Arquivo ausente",
        detail: "Envie o extrato no campo 'arquivo'.",
        statusCode: StatusCodes.Status400BadRequest);

    public static IResult ArquivoGrandeDemais() => Results.Problem(
        title: "Arquivo grande demais",
        detail: "O extrato pode ter no máximo 2 MB.",
        statusCode: StatusCodes.Status413PayloadTooLarge);
}

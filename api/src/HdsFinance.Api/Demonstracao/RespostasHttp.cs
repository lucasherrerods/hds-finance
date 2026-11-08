using HdsFinance.Application.Extratos;

namespace HdsFinance.Api.Demonstracao;

/// <summary>Único lugar que traduz os resultados dos casos de uso em respostas HTTP.</summary>
public static class RespostasHttp
{
    public static IResult De(ResultadoDoResumo resultado) => resultado switch
    {
        ResultadoDoResumo.Resumido r => Results.Ok(JsonDoResumo.De(r)),
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

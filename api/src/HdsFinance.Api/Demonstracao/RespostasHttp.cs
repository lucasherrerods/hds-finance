using HdsFinance.Application.Acesso;
using HdsFinance.Application.Extratos;
using HdsFinance.Application.Admin;
using HdsFinance.Application.Relatorios;

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

    public static IResult De(ResultadoDoRelatorio resultado) => resultado switch
    {
        ResultadoDoRelatorio.Gerado g => Results.File(
            g.Pdf, "application/pdf", $"fechamento-{g.Mes}.pdf"),
        ResultadoDoRelatorio.MesSemDados => Results.Problem(
            title: "Mês sem dados",
            detail: "O extrato não tem transações no mês pedido.",
            statusCode: StatusCodes.Status404NotFound),
        _ => Results.Problem(statusCode: StatusCodes.Status500InternalServerError),
    };

    /// <summary>A mesma resposta para qualquer e-mail: a tela não revela qual é o do admin.</summary>
    public static IResult De(ResultadoDoPedidoDeCodigo resultado) => resultado switch
    {
        ResultadoDoPedidoDeCodigo.CodigoEnviado => Results.NoContent(),
        ResultadoDoPedidoDeCodigo.LimiteAtingido => Results.Problem(
            title: "Limite de códigos", detail: "Muitos pedidos de código. Tente mais tarde.", statusCode: StatusCodes.Status429TooManyRequests),
        _ => Results.Problem(statusCode: StatusCodes.Status500InternalServerError),
    };

    public static IResult De(ResultadoDaConfirmacao resultado) => resultado switch
    {
        ResultadoDaConfirmacao.Confirmado => Results.NoContent(),
        ResultadoDaConfirmacao.Expirado => Results.Problem(
            title: "Código vencido", detail: "O código vale por 10 minutos. Peça um novo.", statusCode: StatusCodes.Status400BadRequest),
        ResultadoDaConfirmacao.TentativasEsgotadas => Results.Problem(
            title: "Tentativas esgotadas", detail: "Peça um código novo.", statusCode: StatusCodes.Status429TooManyRequests),
        _ => Results.Problem(
            title: "Código inválido", detail: "O código não confere. Confira o e-mail recebido.", statusCode: StatusCodes.Status400BadRequest),
    };

    public static IResult De(ResultadoDaFatura resultado) => resultado switch
    {
        ResultadoDaFatura.Importada i => Results.Ok(new { transacoesNovas = i.Novas, duplicadas = i.Duplicadas }),
        ResultadoDaFatura.Invalida i => Results.Problem(
            title: "Fatura inválida", detail: i.Motivo, statusCode: StatusCodes.Status422UnprocessableEntity),
        _ => Results.Problem(title: "Senha necessária", detail: "A fatura tem senha, ou a senha não confere.", statusCode: StatusCodes.Status423Locked),
    };

    public static IResult De(ResultadoDaRemocao resultado) => resultado switch
    {
        ResultadoDaRemocao.Apagado a => Results.Ok(new { apagadas = a.Quantidade }),
        _ => Results.Problem(title: "Nada para apagar", detail: "Não há transações com esses dados.", statusCode: StatusCodes.Status404NotFound),
    };

    /// <summary>Na área admin o motivo vai inteiro: quem lê é o próprio admin.</summary>
    public static IResult De(ResultadoDoFechamento resultado) => resultado switch
    {
        ResultadoDoFechamento.Enviado => Results.Ok(new { mensagem = TextoDoFechamento.De(resultado) }),
        ResultadoDoFechamento.JaEnviado => Fechamento(resultado, "Já enviado", StatusCodes.Status409Conflict),
        ResultadoDoFechamento.MesIncompleto => Fechamento(resultado, "Mês incompleto", StatusCodes.Status422UnprocessableEntity),
        ResultadoDoFechamento.SemDados => Fechamento(resultado, "Mês sem dados", StatusCodes.Status404NotFound),
        _ => Fechamento(resultado, "Falha no envio", StatusCodes.Status502BadGateway),
    };

    private static IResult Fechamento(ResultadoDoFechamento resultado, string titulo, int status) =>
        Results.Problem(title: titulo, detail: TextoDoFechamento.De(resultado), statusCode: status);

    public static IResult MesInvalido() => Results.Problem(
        title: "Mês inválido",
        detail: "Informe o mês no formato AAAA-MM.",
        statusCode: StatusCodes.Status400BadRequest);

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

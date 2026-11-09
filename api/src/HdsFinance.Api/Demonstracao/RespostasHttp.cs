using HdsFinance.Application.EmailDaDemo;
using HdsFinance.Application.Extratos;
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

    public static IResult De(ResultadoDoPedidoDeCodigo resultado) => resultado switch
    {
        ResultadoDoPedidoDeCodigo.CodigoEnviado c => Results.Ok(new { desafio = c.Desafio }),
        ResultadoDoPedidoDeCodigo.EmailInvalido => Results.Problem(
            title: "E-mail inválido", detail: "Confira o endereço digitado.", statusCode: StatusCodes.Status400BadRequest),
        ResultadoDoPedidoDeCodigo.LimiteAtingido => LimiteDeEmails(),
        ResultadoDoPedidoDeCodigo.FalhaNoEnvio => FalhaNoEmail(),
        _ => Results.Problem(statusCode: StatusCodes.Status500InternalServerError),
    };

    public static IResult De(ResultadoDaConfirmacao resultado) => resultado switch
    {
        ResultadoDaConfirmacao.Confirmado c => Results.Ok(new { token = c.Token }),
        ResultadoDaConfirmacao.Expirado => Results.Problem(
            title: "Código vencido", detail: "O código vale por 10 minutos. Peça um novo.", statusCode: StatusCodes.Status400BadRequest),
        _ => Results.Problem(
            title: "Código inválido", detail: "O código não confere. Confira o e-mail recebido.", statusCode: StatusCodes.Status400BadRequest),
    };

    public static IResult De(ResultadoDoEnvioDaDemo resultado) => resultado switch
    {
        ResultadoDoEnvioDaDemo.Enviado e => Results.Ok(new { mes = e.Mes.ToString() }),
        ResultadoDoEnvioDaDemo.NaoConfirmado => Results.Problem(
            title: "E-mail não confirmado", detail: "Confirme o e-mail antes de enviar o relatório.", statusCode: StatusCodes.Status401Unauthorized),
        ResultadoDoEnvioDaDemo.LimiteAtingido => LimiteDeEmails(),
        ResultadoDoEnvioDaDemo.NaoImportado n => De(new ResultadoDoResumo.NaoImportado(n.Motivo)),
        ResultadoDoEnvioDaDemo.MesSemDados => De(new ResultadoDoRelatorio.MesSemDados(null)),
        ResultadoDoEnvioDaDemo.FalhaNoEnvio => FalhaNoEmail(),
        _ => Results.Problem(statusCode: StatusCodes.Status500InternalServerError),
    };

    private static IResult LimiteDeEmails() => Results.Problem(
        title: "Limite de e-mails", detail: "Muitos envios para este endereço. Tente mais tarde.", statusCode: StatusCodes.Status429TooManyRequests);

    // O motivo real fica de fora: pode citar a configuração do servidor.
    private static IResult FalhaNoEmail() => Results.Problem(
        title: "Falha no envio", detail: "Não foi possível enviar o e-mail agora.", statusCode: StatusCodes.Status502BadGateway);

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

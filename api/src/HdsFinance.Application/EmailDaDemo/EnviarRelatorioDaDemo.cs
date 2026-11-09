using HdsFinance.Application.Extratos;
using HdsFinance.Application.ModoPessoal;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;

namespace HdsFinance.Application.EmailDaDemo;

public abstract record ResultadoDoEnvioDaDemo
{
    public sealed record Enviado(MesDeReferencia Mes) : ResultadoDoEnvioDaDemo;

    public sealed record NaoConfirmado : ResultadoDoEnvioDaDemo;

    public sealed record LimiteAtingido : ResultadoDoEnvioDaDemo;

    public sealed record NaoImportado(ResultadoDaImportacao Motivo) : ResultadoDoEnvioDaDemo;

    public sealed record MesSemDados : ResultadoDoEnvioDaDemo;

    public sealed record FalhaNoEnvio(string Motivo) : ResultadoDoEnvioDaDemo;
}

/// <summary>Na demonstração, manda o PDF do mês para um e-mail já confirmado. O conteúdo é só o relatório.</summary>
public sealed class EnviarRelatorioDaDemo(
    ResumirExtrato resumir,
    GerarRelatorio gerar,
    ConfirmacaoDeEmail confirmacao,
    IEnvioDeEmail envio,
    ILimiteDeEnvios limite)
{
    private const int EnviosPorDia = 5;

    public async Task<ResultadoDoEnvioDaDemo> ExecutarAsync(
        Stream conteudo,
        FormatoDeExtrato formato,
        string email,
        string token,
        MesDeReferencia? mes = null,
        CancellationToken cancelamento = default)
    {
        if (!confirmacao.EstaConfirmado(email, token))
        {
            return new ResultadoDoEnvioDaDemo.NaoConfirmado();
        }

        var endereco = ConfirmacaoDeEmail.Normalizar(email);
        if (!limite.Permitir($"relatorio:{confirmacao.Chave(endereco)}", EnviosPorDia, TimeSpan.FromDays(1)))
        {
            return new ResultadoDoEnvioDaDemo.LimiteAtingido();
        }

        var resumo = await resumir.ExecutarAsync(conteudo, formato, cancelamento);
        if (resumo is not ResultadoDoResumo.Resumido resumido)
        {
            return new ResultadoDoEnvioDaDemo.NaoImportado(((ResultadoDoResumo.NaoImportado)resumo).Motivo);
        }

        if (gerar.Executar(resumido.Meses, mes) is not ResultadoDoRelatorio.Gerado gerado)
        {
            return new ResultadoDoEnvioDaDemo.MesSemDados();
        }

        var titulo = $"Fechamento de {gerado.Mes}";
        var enviado = await envio.EnviarAsync(
            new EmailParaEnviar(endereco, titulo, $"<p>{titulo} em anexo, gerado pelo hds finance.</p>",
                new AnexoDoEmail($"fechamento-{gerado.Mes}.pdf", gerado.Pdf)),
            cancelamento);

        return enviado is ResultadoDoEnvio.Falha falha
            ? new ResultadoDoEnvioDaDemo.FalhaNoEnvio(falha.Motivo)
            : new ResultadoDoEnvioDaDemo.Enviado(gerado.Mes);
    }
}

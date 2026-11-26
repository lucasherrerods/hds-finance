using HdsFinance.Application.Assistente;
using HdsFinance.Application.Extratos;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;

namespace HdsFinance.Application.Admin;

public abstract record ResultadoDoFechamento(MesDeReferencia Mes)
{
    public sealed record Enviado(MesDeReferencia Mes) : ResultadoDoFechamento(Mes);

    public sealed record JaEnviado(MesDeReferencia Mes) : ResultadoDoFechamento(Mes);

    public sealed record MesIncompleto(MesDeReferencia Mes) : ResultadoDoFechamento(Mes);

    public sealed record SemDados(MesDeReferencia Mes) : ResultadoDoFechamento(Mes);

    public sealed record FalhaNoEnvio(MesDeReferencia Mes, string Motivo) : ResultadoDoFechamento(Mes);
}

/// <summary>
/// Fechamento da área admin: monta os meses a partir do histórico guardado, gera o PDF e envia.
/// Só envia mês completo e nunca o mesmo mês duas vezes, a menos que seja forçado.
/// Com um mensageiro configurado (Telegram), o PDF vai também por lá, com a análise do mês; basta um dos canais entregar.
/// </summary>
public sealed class FecharMes(
    IRepositorioDeTransacoes transacoes,
    IRegistroDoAdmin registro,
    GerarRelatorio gerarRelatorio,
    INotificador notificador,
    TimeProvider tempo,
    Categorizador? categorizador = null,
    AnalisarMes? analisar = null,
    IMensageiro? mensageiro = null)
{
    /// <summary>As transações guardadas, com as faturas conciliadas e as transferências entre bancos tiradas.</summary>
    public async Task<IReadOnlyList<Transacao>> TransacoesAsync(CancellationToken cancelamento = default) =>
        TransferenciasEntreBancos.Aplicar(ConciliacaoDaFatura.Aplicar(await transacoes.ListarAsync(cancelamento)));

    public async Task<IReadOnlyList<ResumoMensal>> MesesAsync(CancellationToken cancelamento = default) =>
        Meses(await TransacoesAsync(cancelamento), await registro.CoberturaAsync(cancelamento), categorizador);

    private static IReadOnlyList<ResumoMensal> Meses(IReadOnlyList<Transacao> todas, CoberturaDoHistorico cobertura, Categorizador? categorizador)
    {
        if (todas.Count == 0)
        {
            return [];
        }

        // O saldo guardado só vale para reconstruir os meses se o extrato dele chega até a última transação.
        var saldo = cobertura.CobertoAte >= todas.Where(t => t.MexeNoSaldo).Select(t => t.Data).DefaultIfEmpty().Max() ? cobertura.SaldoFinal : null;
        return ResumoMensal.PorMes(todas, saldo, categorizador);
    }

    public async Task<ResultadoDoRelatorio> GerarAsync(MesDeReferencia? mes, CancellationToken cancelamento = default) =>
        gerarRelatorio.Executar(await MesesAsync(cancelamento), mes);

    public async Task<ResultadoDoFechamento> EnviarAsync(
        MesDeReferencia mes, bool forcar = false, CancellationToken cancelamento = default)
    {
        if (!forcar)
        {
            if (await registro.JaEnviadoAsync(mes, cancelamento))
            {
                return new ResultadoDoFechamento.JaEnviado(mes);
            }

            if (!mes.EstaCompleto((await registro.CoberturaAsync(cancelamento)).CobertoAte))
            {
                return new ResultadoDoFechamento.MesIncompleto(mes);
            }
        }

        if (await GerarAsync(mes, cancelamento) is not ResultadoDoRelatorio.Gerado gerado)
        {
            return new ResultadoDoFechamento.SemDados(mes);
        }

        var porEmail = await notificador.EnviarAsync(mes, gerado.Pdf, cancelamento);
        var porMensagem = await EnviarMensagemAsync(mes, gerado.Pdf, cancelamento);
        if (porEmail is ResultadoDoEnvio.Falha falha && !porMensagem)
        {
            return new ResultadoDoFechamento.FalhaNoEnvio(mes, falha.Motivo);
        }

        await registro.MarcarEnviadoAsync(mes, tempo.GetUtcNow(), cancelamento);
        return new ResultadoDoFechamento.Enviado(mes);
    }

    /// <summary>A análise do mês: alertas sempre, comentário da IA quando ela responde.</summary>
    public async Task<AnaliseDoMes?> AnalisarAsync(MesDeReferencia? mes, CancellationToken cancelamento = default)
    {
        if (analisar is null)
        {
            return null;
        }

        var todas = await TransacoesAsync(cancelamento);
        var meses = Meses(todas, await registro.CoberturaAsync(cancelamento), categorizador);
        return (mes ?? meses.LastOrDefault()?.Mes) is { } alvo ? await analisar.ExecutarAsync(meses, todas, alvo, cancelamento) : null;
    }

    private async Task<bool> EnviarMensagemAsync(MesDeReferencia mes, byte[] pdf, CancellationToken cancelamento)
    {
        if (mensageiro is not { Configurado: true })
        {
            return false;
        }

        var texto = (await AnalisarAsync(mes, cancelamento))?.Mensagem() ?? $"Fechamento de {Formato.Mes(mes)}";
        var enviado = await mensageiro.EnviarTextoAsync(texto, cancelamento);
        return await mensageiro.EnviarArquivoAsync($"fechamento-{mes}.pdf", pdf, $"Fechamento de {Formato.Mes(mes)}", cancelamento) || enviado;
    }

    /// <summary>Envia só o mês completo mais recente, para importar um ano de extratos não disparar doze e-mails.</summary>
    public async Task<ResultadoDoFechamento?> EnviarUltimoCompletoAsync(CancellationToken cancelamento = default) =>
        MesDeReferencia.UltimoCompleto((await registro.CoberturaAsync(cancelamento)).CobertoAte) is { } mes
            ? await EnviarAsync(mes, cancelamento: cancelamento)
            : null;
}

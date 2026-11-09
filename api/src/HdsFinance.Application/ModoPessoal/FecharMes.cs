using HdsFinance.Application.Extratos;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;

namespace HdsFinance.Application.ModoPessoal;

public abstract record ResultadoDoFechamento(MesDeReferencia Mes)
{
    public sealed record Enviado(MesDeReferencia Mes) : ResultadoDoFechamento(Mes);

    public sealed record JaEnviado(MesDeReferencia Mes) : ResultadoDoFechamento(Mes);

    public sealed record MesIncompleto(MesDeReferencia Mes) : ResultadoDoFechamento(Mes);

    public sealed record SemDados(MesDeReferencia Mes) : ResultadoDoFechamento(Mes);

    public sealed record FalhaNoEnvio(MesDeReferencia Mes, string Motivo) : ResultadoDoFechamento(Mes);
}

/// <summary>
/// Fechamento do modo pessoal: monta os meses a partir do histórico guardado, gera o PDF e envia.
/// Só envia mês completo e nunca o mesmo mês duas vezes, a menos que seja forçado.
/// </summary>
public sealed class FecharMes(
    IRepositorioDeTransacoes transacoes,
    IRegistroDoModoPessoal registro,
    GerarRelatorio gerarRelatorio,
    INotificador notificador,
    TimeProvider tempo,
    Categorizador? categorizador = null)
{
    public async Task<IReadOnlyList<ResumoMensal>> MesesAsync(CancellationToken cancelamento = default)
    {
        var todas = await transacoes.ListarAsync(cancelamento);
        if (todas.Count == 0)
        {
            return [];
        }

        // O saldo guardado só vale para reconstruir os meses se o extrato dele chega até a última transação.
        var cobertura = await registro.CoberturaAsync(cancelamento);
        var saldo = cobertura.CobertoAte >= todas.Max(t => t.Data) ? cobertura.SaldoFinal : null;
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

        if (await notificador.EnviarAsync(mes, gerado.Pdf, cancelamento) is ResultadoDoEnvio.Falha falha)
        {
            return new ResultadoDoFechamento.FalhaNoEnvio(mes, falha.Motivo);
        }

        await registro.MarcarEnviadoAsync(mes, tempo.GetUtcNow(), cancelamento);
        return new ResultadoDoFechamento.Enviado(mes);
    }

    /// <summary>Envia só o mês completo mais recente, para importar um ano de extratos não disparar doze e-mails.</summary>
    public async Task<ResultadoDoFechamento?> EnviarUltimoCompletoAsync(CancellationToken cancelamento = default) =>
        MesDeReferencia.UltimoCompleto((await registro.CoberturaAsync(cancelamento)).CobertoAte) is { } mes
            ? await EnviarAsync(mes, cancelamento: cancelamento)
            : null;
}

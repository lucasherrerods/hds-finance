using HdsFinance.Application.Extratos;
using HdsFinance.Domain;

namespace HdsFinance.Application.Admin;

public sealed record HistoricoConsultado(
    IReadOnlyList<ResumoMensal> Meses,
    PainelDoMes? Painel,
    IReadOnlyList<TransacaoCategorizada> Transacoes,
    SaldoDaConta? Saldo = null,
    IReadOnlyList<FaturaDoHistorico>? Faturas = null)
{
    public IReadOnlyList<FaturaDoHistorico> Faturas { get; init; } = Faturas ?? [];
}

/// <summary>O que o painel da área admin mostra: todos os meses guardados, o painel do mais recente, as transações e o saldo da conta.</summary>
public sealed class ConsultarHistorico(IRepositorioDeTransacoes transacoes, FecharMes fechar, IRegistroDoAdmin registro, Categorizador? categorizador = null)
{
    public async Task<HistoricoConsultado> ExecutarAsync(CancellationToken cancelamento = default)
    {
        var meses = await fechar.MesesAsync(cancelamento);
        if (meses.Count == 0)
        {
            return new HistoricoConsultado([], null, []);
        }

        var regras = categorizador ?? Categorizador.Padrao;
        var guardadas = await transacoes.ListarAsync(cancelamento);
        var todas = TransferenciasEntreBancos.Aplicar(ConciliacaoDaFatura.Aplicar(guardadas));
        var cobertura = await registro.CoberturaAsync(cancelamento);
        return new HistoricoConsultado(
            meses,
            PainelDoMes.Montar(todas, regras),
            TransacaoCategorizada.Listar(todas, regras),
            SaldoDaConta.Calcular(todas, cobertura.SaldoFinal, cobertura.CobertoAte),
            FaturaDoHistorico.Listar(guardadas, regras));
    }
}

using HdsFinance.Application.Extratos;
using HdsFinance.Domain;

namespace HdsFinance.Application.Admin;

public sealed record HistoricoConsultado(
    IReadOnlyList<ResumoMensal> Meses,
    PainelDoMes? Painel,
    IReadOnlyList<TransacaoCategorizada> Transacoes);

/// <summary>O que o painel da área admin mostra: todos os meses guardados, o painel do mais recente e as transações.</summary>
public sealed class ConsultarHistorico(IRepositorioDeTransacoes transacoes, FecharMes fechar, Categorizador? categorizador = null)
{
    public async Task<HistoricoConsultado> ExecutarAsync(CancellationToken cancelamento = default)
    {
        var meses = await fechar.MesesAsync(cancelamento);
        if (meses.Count == 0)
        {
            return new HistoricoConsultado([], null, []);
        }

        var regras = categorizador ?? Categorizador.Padrao;
        var todas = await transacoes.ListarAsync(cancelamento);
        return new HistoricoConsultado(
            meses,
            PainelDoMes.Montar(todas, regras),
            TransacaoCategorizada.Listar(todas, regras));
    }
}

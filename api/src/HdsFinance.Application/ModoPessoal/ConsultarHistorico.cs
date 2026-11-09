using HdsFinance.Application.Extratos;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;

namespace HdsFinance.Application.ModoPessoal;

public sealed record HistoricoConsultado(
    IReadOnlyList<ResumoMensal> Meses,
    PainelDoMes? Painel,
    IReadOnlyList<TransacaoCategorizada> Transacoes);

/// <summary>O que o painel do modo pessoal mostra: os últimos 12 meses guardados, o painel do mais recente e as transações deles.</summary>
public sealed class ConsultarHistorico(IRepositorioDeTransacoes transacoes, FecharMes fechar, Categorizador? categorizador = null)
{
    public async Task<HistoricoConsultado> ExecutarAsync(CancellationToken cancelamento = default)
    {
        var meses = (await fechar.MesesAsync(cancelamento)).TakeLast(GerarRelatorio.MesesDeHistorico).ToList();
        if (meses.Count == 0)
        {
            return new HistoricoConsultado([], null, []);
        }

        var regras = categorizador ?? Categorizador.Padrao;
        var todas = await transacoes.ListarAsync(cancelamento);
        var inicio = new DateOnly(meses[0].Mes.Ano, meses[0].Mes.Mes, 1);
        return new HistoricoConsultado(
            meses,
            PainelDoMes.Montar(todas, regras),
            TransacaoCategorizada.Listar(todas.Where(t => t.Data >= inicio), regras));
    }
}

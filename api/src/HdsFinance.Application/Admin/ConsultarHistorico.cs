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

    /// <summary>Do mês mais recente, só dos grupos com limite.</summary>
    public IReadOnlyList<OrcamentoDoGrupo> Orcamento { get; init; } = [];

    /// <summary>Situação de cada recorrente no mês mais recente.</summary>
    public IReadOnlyList<Recorrente> Recorrentes { get; init; } = [];

    /// <summary>Só quando o mês mais recente é o de hoje.</summary>
    public ProjecaoDoMes? Projecao { get; init; }
}

/// <summary>O que o painel da área admin mostra: todos os meses guardados, o painel do mais recente, as transações e o saldo da conta.</summary>
public sealed class ConsultarHistorico(
    IRepositorioDeTransacoes transacoes,
    FecharMes fechar,
    IRegistroDoAdmin registro,
    IRepositorioDeOrcamentos orcamentos,
    TimeProvider tempo,
    Categorizador? categorizador = null)
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
        var maisRecente = meses[^1].Mes;
        var hoje = DateOnly.FromDateTime(tempo.GetLocalNow().DateTime);
        var recorrentes = Recorrentes.Detectar(todas, regras, maisRecente);
        var limites = await orcamentos.ListarAsync(cancelamento);
        return new HistoricoConsultado(
            meses,
            PainelDoMes.Montar(todas, regras),
            TransacaoCategorizada.Listar(todas, regras),
            SaldoDaConta.Calcular(todas, cobertura.SaldoFinal, cobertura.CobertoAte),
            FaturaDoHistorico.Listar(guardadas, regras))
        {
            Orcamento = Orcamento.Acompanhar(limites, todas, regras, maisRecente),
            Recorrentes = recorrentes,
            Projecao = maisRecente.Contem(hoje) ? ProjecaoDoMes.Calcular(todas, recorrentes, hoje) : null,
        };
    }
}

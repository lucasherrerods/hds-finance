namespace HdsFinance.Domain;

/// <summary>Como o mês em andamento deve fechar, se o ritmo dos gastos variáveis continuar.</summary>
public sealed record ProjecaoDoMes(
    MesDeReferencia Mes,
    int DiasPassados,
    int DiasNoMes,
    decimal GastoAteAgora,
    decimal GastoProjetado,
    decimal RecorrentesPendentes,
    decimal Entradas,
    decimal SobraProjetada)
{
    /// <summary>
    /// O que é recorrente não entra no ritmo: o que já saiu conta uma vez, e o que falta entra pelo valor de costume.
    /// Sem movimento no mês de hoje, não há o que projetar.
    /// </summary>
    public static ProjecaoDoMes? Calcular(IEnumerable<Transacao> transacoes, IReadOnlyList<Recorrente> recorrentes, DateOnly hoje)
    {
        var mes = new MesDeReferencia(hoje.Year, hoje.Month);
        var doMes = transacoes.Where(t => mes.Contem(t.Data) && t.Data <= hoje).ToList();
        if (doMes.Count == 0)
        {
            return null;
        }

        var gasto = doMes.Where(t => t.EhGasto).Sum(t => -t.Valor);
        var entradas = doMes.Where(t => t.ContaNoFluxoDeCaixa && t.Tipo == TipoDeTransacao.Comum && t.Valor > 0).Sum(t => t.Valor);
        var recorrentesPagas = recorrentes.Sum(r => r.ValorNoMes ?? 0m);
        var pendentes = recorrentes.Where(r => r.Situacao == SituacaoDaRecorrente.Pendente).Sum(r => r.Valor);

        var diasNoMes = DateTime.DaysInMonth(mes.Ano, mes.Mes);
        var porDia = Math.Max(0m, gasto - recorrentesPagas) / hoje.Day;
        var projetado = Math.Round(gasto + porDia * (diasNoMes - hoje.Day) + pendentes, 2);
        return new ProjecaoDoMes(mes, hoje.Day, diasNoMes, gasto, projetado, pendentes, entradas, entradas - projetado);
    }
}

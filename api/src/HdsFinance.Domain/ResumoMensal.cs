namespace HdsFinance.Domain;

/// <summary>
/// Fecha assim: saldo inicial + entradas − saídas + investimentos e transferências = saldo final.
/// Entradas e saídas são só receitas e despesas; aplicações, resgates e transferências entre contas
/// próprias mexem no saldo da conta, mas ficam no próprio campo.
/// O saldo fica nulo quando o extrato não informa nenhum.
/// </summary>
public sealed record ResumoMensal(
    MesDeReferencia Mes,
    decimal? SaldoInicial,
    decimal Entradas,
    decimal Saidas,
    decimal InvestimentosETransferencias)
{
    public decimal Resultado => Entradas - Saidas;

    public decimal? SaldoFinal => SaldoInicial + Resultado + InvestimentosETransferencias;

    public static ResumoMensal Calcular(MesDeReferencia mes, decimal? saldoInicial, IEnumerable<Transacao> transacoes)
    {
        var doMes = transacoes.Where(t => mes.Contem(t.Data)).ToList();
        var fluxo = doMes.Where(t => t.ContaNoFluxoDeCaixa).ToList();

        var entradas = fluxo.Where(t => t.Valor > 0).Sum(t => t.Valor);
        var saidas = -fluxo.Where(t => t.Valor < 0).Sum(t => t.Valor);
        var internas = doMes.Where(t => !t.ContaNoFluxoDeCaixa).Sum(t => t.Valor);

        return new ResumoMensal(mes, saldoInicial, entradas, saidas, internas);
    }

    /// <summary>
    /// Um resumo por mês, do mais antigo ao mais recente. O saldo inicial do primeiro mês é
    /// o saldo final do extrato menos tudo o que foi movimentado nele.
    /// </summary>
    public static IReadOnlyList<ResumoMensal> PorMes(IEnumerable<Transacao> transacoes, decimal? saldoFinalDoExtrato = null)
    {
        var lista = transacoes.ToList();
        var saldo = saldoFinalDoExtrato - lista.Sum(t => t.Valor);

        var resumos = new List<ResumoMensal>();
        foreach (var mes in lista
            .Select(t => new MesDeReferencia(t.Data.Year, t.Data.Month))
            .Distinct()
            .OrderBy(m => m.Ano).ThenBy(m => m.Mes))
        {
            var resumo = Calcular(mes, saldo, lista);
            resumos.Add(resumo);
            saldo = resumo.SaldoFinal;
        }

        return resumos;
    }
}

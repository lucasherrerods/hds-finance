namespace HdsFinance.Domain;

public sealed record ResumoMensal(MesDeReferencia Mes, decimal SaldoInicial, decimal Entradas, decimal Saidas)
{
    public decimal Resultado => Entradas - Saidas;

    public decimal SaldoFinal => SaldoInicial + Resultado;

    public static ResumoMensal Calcular(MesDeReferencia mes, decimal saldoInicial, IEnumerable<Transacao> transacoes)
    {
        var doMes = transacoes.Where(t => mes.Contem(t.Data) && t.ContaNoFluxoDeCaixa).ToList();

        var entradas = doMes.Where(t => t.Valor > 0).Sum(t => t.Valor);
        var saidas = -doMes.Where(t => t.Valor < 0).Sum(t => t.Valor);

        return new ResumoMensal(mes, saldoInicial, entradas, saidas);
    }

    /// <summary>Um resumo por mês presente nas transações, do mais antigo ao mais recente, com saldo inicial zero.</summary>
    public static IReadOnlyList<ResumoMensal> PorMes(IEnumerable<Transacao> transacoes)
    {
        var lista = transacoes.ToList();
        return lista
            .Select(t => new MesDeReferencia(t.Data.Year, t.Data.Month))
            .Distinct()
            .OrderBy(m => m.Ano).ThenBy(m => m.Mes)
            .Select(m => Calcular(m, 0m, lista))
            .ToList();
    }
}

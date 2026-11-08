namespace HdsFinance.Domain;

public sealed record ResumoMensal(MesDeReferencia Mes, decimal SaldoInicial, decimal Entradas, decimal Saidas)
{
    public decimal SaldoFinal => SaldoInicial + Entradas - Saidas;

    public static ResumoMensal Calcular(MesDeReferencia mes, decimal saldoInicial, IEnumerable<Transacao> transacoes)
    {
        var doMes = transacoes.Where(t => mes.Contem(t.Data) && t.ContaNoFluxoDeCaixa).ToList();

        var entradas = doMes.Where(t => t.Valor > 0).Sum(t => t.Valor);
        var saidas = -doMes.Where(t => t.Valor < 0).Sum(t => t.Valor);

        return new ResumoMensal(mes, saldoInicial, entradas, saidas);
    }
}

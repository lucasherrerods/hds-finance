namespace HdsFinance.Domain;

/// <summary>
/// Quanto há na conta. Vale o saldo que o banco informou, mais o que se moveu depois dele; sem ele, a soma de tudo o que
/// foi importado, que só está certa com o extrato desde a abertura da conta.
/// AntesDoHistorico é a parte do saldo informado que os extratos não explicam: zero quando o histórico está inteiro.
/// </summary>
public sealed record SaldoDaConta(decimal Valor, DateOnly Em, bool Informado, decimal? AntesDoHistorico)
{
    public static SaldoDaConta? Calcular(IEnumerable<Transacao> transacoes, decimal? informado = null, DateOnly? informadoEm = null)
    {
        var daConta = transacoes.Where(t => t.MexeNoSaldo).ToList();
        if (daConta.Count == 0)
        {
            return null;
        }

        var soma = daConta.Sum(t => t.Valor);
        var ultima = daConta.Max(t => t.Data);
        if (informado is not { } saldo || informadoEm is not { } em)
        {
            return new SaldoDaConta(soma, ultima, Informado: false, AntesDoHistorico: null);
        }

        var valor = saldo + daConta.Where(t => t.Data > em).Sum(t => t.Valor);
        return new SaldoDaConta(valor, ultima > em ? ultima : em, Informado: true, valor - soma);
    }
}

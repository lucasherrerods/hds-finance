namespace HdsFinance.Domain;

/// <summary>
/// O que o extrato da conta mostra dos investimentos: aplicações (dinheiro que saiu para investir) e resgates
/// (que voltou). O extrato não traz rendimento, então o acumulado é quanto foi aplicado de forma líquida
/// desde o primeiro mês do histórico, não o valor de mercado.
/// </summary>
public sealed record PosicaoDeInvestimento(decimal Aplicado, decimal Resgatado, decimal AplicadoAcumulado)
{
    public static PosicaoDeInvestimento Zerada { get; } = new(0m, 0m, 0m);

    public decimal LiquidoNoMes => Aplicado - Resgatado;

    public static PosicaoDeInvestimento Do(IEnumerable<Transacao> doMes, decimal acumuladoAnterior = 0m)
    {
        var movimentos = doMes.Where(t => t.Tipo == TipoDeTransacao.MovimentacaoDeInvestimento).ToList();
        var aplicado = -movimentos.Where(t => t.Valor < 0).Sum(t => t.Valor);
        var resgatado = movimentos.Where(t => t.Valor > 0).Sum(t => t.Valor);
        return new PosicaoDeInvestimento(aplicado, resgatado, acumuladoAnterior + aplicado - resgatado);
    }
}

namespace HdsFinance.Domain;

/// <summary>
/// Fecha assim: saldo inicial + entradas − saídas + investimentos e transferências + empréstimos + compras no cartão + ocultas + outros bancos = saldo final.
/// Compra no cartão é saída no mês dela, mas o dinheiro só sai no pagamento: o campo ComprasNoCartao devolve o valor ao saldo.
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

    public decimal? SaldoFinal => SaldoInicial + Resultado + InvestimentosETransferencias + Emprestimos + ComprasNoCartao + Ocultas + OutrosBancos;

    /// <summary>Tira do saldo, que é do Inter, o que as somas contam dos outros bancos.</summary>
    public decimal OutrosBancos { get; init; }

    /// <summary>O que as transações ocultas moveram na conta: fora das somas, mas o saldo precisa fechar.</summary>
    public decimal Ocultas { get; init; }

    /// <summary>O que entrou emprestado: não é receita, mas o dinheiro está na conta.</summary>
    public decimal Emprestimos { get; init; }

    /// <summary>O que foi gasto no cartão no mês, já com os estornos abatidos.</summary>
    public decimal ComprasNoCartao { get; init; }

    public IReadOnlyList<GastoPorCategoria> GastosPorCategoria { get; init; } = [];

    public PosicaoDeInvestimento Investimentos { get; init; } = PosicaoDeInvestimento.Zerada;

    public static ResumoMensal Calcular(
        MesDeReferencia mes,
        decimal? saldoInicial,
        IEnumerable<Transacao> transacoes,
        Categorizador? categorizador = null,
        decimal investidoAntes = 0m)
    {
        var doMes = transacoes.Where(t => mes.Contem(t.Data)).ToList();
        var fluxo = doMes.Where(t => t.ContaNoFluxoDeCaixa).ToList();

        var entradas = fluxo.Where(t => !t.EhGasto).Sum(t => t.Valor);
        var saidas = -fluxo.Where(t => t.EhGasto).Sum(t => t.Valor);
        var internas = doMes.Where(t => !t.Oculta && !t.ContaNoFluxoDeCaixa && !t.EhEmprestimoRecebido).Sum(t => t.Valor);

        var gastos = GastoPorCategoria.Somar(fluxo.Where(t => t.EhGasto), categorizador ?? Categorizador.Padrao);

        return new ResumoMensal(mes, saldoInicial, entradas, saidas, internas)
        {
            GastosPorCategoria = gastos,
            Emprestimos = doMes.Where(t => !t.Oculta && t.EhEmprestimoRecebido).Sum(t => t.Valor),
            ComprasNoCartao = -doMes.Where(t => !t.Oculta && t.Tipo == TipoDeTransacao.CompraNoCartao).Sum(t => t.Valor),
            OutrosBancos = -doMes.Where(t => !t.Oculta && t.Banco != Banco.Inter && t.Tipo != TipoDeTransacao.CompraNoCartao).Sum(t => t.Valor),
            Ocultas = doMes.Where(t => t.Oculta && t.MexeNoSaldo).Sum(t => t.Valor),
            Investimentos = PosicaoDeInvestimento.Do(doMes.Where(t => !t.Oculta), investidoAntes),
        };
    }

    /// <summary>
    /// Um resumo por mês, do mais antigo ao mais recente. O saldo inicial do primeiro mês é
    /// o saldo final do extrato menos tudo o que foi movimentado nele.
    /// </summary>
    public static IReadOnlyList<ResumoMensal> PorMes(
        IEnumerable<Transacao> transacoes, decimal? saldoFinalDoExtrato = null, Categorizador? categorizador = null)
    {
        var lista = transacoes.ToList();
        var saldo = saldoFinalDoExtrato - lista.Where(t => t.MexeNoSaldo).Sum(t => t.Valor);

        var resumos = new List<ResumoMensal>();
        foreach (var mes in lista
            .Select(t => new MesDeReferencia(t.Data.Year, t.Data.Month))
            .Distinct()
            .OrderBy(m => m.Ano).ThenBy(m => m.Mes))
        {
            var resumo = Calcular(mes, saldo, lista, categorizador, resumos.LastOrDefault()?.Investimentos.AplicadoAcumulado ?? 0m);
            resumos.Add(resumo);
            saldo = resumo.SaldoFinal;
        }

        return resumos;
    }
}

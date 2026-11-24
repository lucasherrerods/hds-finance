namespace HdsFinance.Domain;

/// <summary>
/// Uma fatura já incluída. Gasto é o que foi comprado, com estornos abatidos; Total é o que havia a pagar.
/// Total nulo quando não há registro dele; aí também não dá para saber se foi paga.
/// </summary>
public sealed record FaturaDoHistorico(
    DateOnly Vencimento, decimal? Total, decimal Gasto, bool? Paga, IReadOnlyList<TransacaoCategorizada> Compras)
{
    public Banco Banco { get; init; } = Banco.Inter;

    private const int DiasAteAFaturaSeguinte = 45;

    /// <summary>Da mais nova para a mais antiga.</summary>
    public static IReadOnlyList<FaturaDoHistorico> Listar(IEnumerable<Transacao> transacoes, Categorizador categorizador)
    {
        var todas = transacoes.ToList();
        var marcasPagas = ConciliacaoDaFatura.Conciliar(todas).MarcasPagas;
        var marcasDeTodos = todas.Where(t => t.Tipo == TipoDeTransacao.PagamentoDeFatura).ToList();

        return todas
            .Where(t => t.Tipo == TipoDeTransacao.CompraNoCartao)
            .GroupBy(t => (Vencimento: ConciliacaoDaFatura.VencimentoDe(t), t.Banco))
            .Where(g => g.Key.Vencimento is not null)
            .OrderByDescending(g => g.Key.Vencimento)
            .Select(g => Montar(g.Key.Vencimento!.Value, g.Key.Banco, g.ToList()))
            .ToList();

        FaturaDoHistorico Montar(DateOnly vencimento, Banco banco, List<Transacao> compras)
        {
            var marcas = marcasDeTodos.Where(m => m.Banco == banco).ToList();
            var total = marcas.FirstOrDefault(m => ConciliacaoDaFatura.Papel(m) == "total" && ConciliacaoDaFatura.VencimentoDe(m) == vencimento);
            // Paga em partes: as partes aparecem na fatura seguinte.
            var emPartes = marcas
                .Where(m => ConciliacaoDaFatura.Papel(m) == "anterior" && marcasPagas.Contains(m.ChaveDeDeduplicacao)
                    && ConciliacaoDaFatura.VencimentoDe(m) is { } seguinte
                    && seguinte > vencimento && seguinte <= vencimento.AddDays(DiasAteAFaturaSeguinte))
                .Sum(m => m.Valor);

            return new FaturaDoHistorico(
                vencimento,
                total?.Valor,
                -compras.Where(c => !c.Oculta).Sum(c => c.Valor),
                total is null ? null : marcasPagas.Contains(total.ChaveDeDeduplicacao) || emPartes >= total.Valor,
                TransacaoCategorizada.Listar(compras, categorizador))
            {
                Banco = banco,
            };
        }
    }
}

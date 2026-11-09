namespace HdsFinance.Domain;

/// <summary>Transação pronta para exibir: despesas pela regra de categoria, entradas e movimentações internas com categoria própria.</summary>
public sealed record TransacaoCategorizada(DateOnly Data, string Descricao, string Categoria, decimal Valor)
{
    public const string CategoriaDeEntrada = "Entrada";
    public const string CategoriaDeMovimentacaoInterna = "Investimentos e transferências";

    public static TransacaoCategorizada De(Transacao transacao, Categorizador categorizador) => new(
        transacao.Data,
        transacao.Descricao,
        !transacao.ContaNoFluxoDeCaixa ? CategoriaDeMovimentacaoInterna
            : transacao.Valor > 0 ? CategoriaDeEntrada
            : categorizador.Categorizar(transacao),
        transacao.Valor);

    /// <summary>Da mais nova para a mais antiga; no mesmo dia, na ordem em que vieram no arquivo.</summary>
    public static IReadOnlyList<TransacaoCategorizada> Listar(IEnumerable<Transacao> transacoes, Categorizador categorizador) =>
        transacoes.OrderByDescending(t => t.Data).Select(t => De(t, categorizador)).ToList();
}

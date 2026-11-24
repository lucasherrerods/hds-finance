namespace HdsFinance.Domain;

/// <summary>Transação pronta para exibir: despesas pela regra de categoria, entradas e movimentações internas com categoria própria.</summary>
public sealed record TransacaoCategorizada(DateOnly Data, string Descricao, string Categoria, decimal Valor, bool NoCartao = false)
{
    public const string CategoriaDeEntrada = "Entrada";
    public const string CategoriaDeMovimentacaoInterna = "Investimentos e transferências";

    /// <summary>Identifica a transação guardada, para o admin ajustar.</summary>
    public string Chave { get; init; } = string.Empty;

    public bool Oculta { get; init; }

    public Banco Banco { get; init; } = Banco.Inter;

    public static TransacaoCategorizada De(Transacao transacao, Categorizador categorizador)
    {
        // Oculta só sai das somas: na lista, a categoria é a mesma de antes.
        var visivel = transacao with { Oculta = false };
        var categoria = !visivel.ContaNoFluxoDeCaixa ? CategoriaDeMovimentacaoInterna
            : !visivel.EhGasto ? transacao.Categoria ?? CategoriaDeEntrada
            : categorizador.Categorizar(transacao);
        return new TransacaoCategorizada(
            transacao.Data, transacao.Descricao, categoria, transacao.Valor, transacao.Tipo == TipoDeTransacao.CompraNoCartao)
        {
            Chave = transacao.ChaveDeDeduplicacao,
            Oculta = transacao.Oculta,
            Banco = transacao.Banco,
        };
    }

    /// <summary>Da mais nova para a mais antiga; no mesmo dia, na ordem em que vieram no arquivo.</summary>
    public static IReadOnlyList<TransacaoCategorizada> Listar(IEnumerable<Transacao> transacoes, Categorizador categorizador) =>
        transacoes.OrderByDescending(t => t.Data).Select(t => De(t, categorizador)).ToList();
}

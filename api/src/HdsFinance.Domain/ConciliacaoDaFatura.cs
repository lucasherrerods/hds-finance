namespace HdsFinance.Domain;

/// <summary>
/// Evita contar o cartão duas vezes: o pagamento de uma fatura incluída deixa de ser gasto.
/// Reconhece pelo valor e pela data, então não depende do texto do extrato nem da ordem de importação.
/// </summary>
public static class ConciliacaoDaFatura
{
    private static readonly string[] TermosDeFatura = ["FATURA", "CARTAO"];

    public static IReadOnlyList<Transacao> Aplicar(IEnumerable<Transacao> transacoes) => Conciliar(transacoes).Transacoes;

    /// <summary>As transações para mostrar e somar, e as chaves das marcas que acharam o pagamento delas.</summary>
    internal static (IReadOnlyList<Transacao> Transacoes, IReadOnlySet<string> MarcasPagas) Conciliar(IEnumerable<Transacao> transacoes)
    {
        var todas = transacoes.ToList();
        var marcas = todas.Where(t => t.Tipo == TipoDeTransacao.PagamentoDeFatura).ToList();
        if (marcas.Count == 0)
        {
            return (todas, new HashSet<string>());
        }

        var faturas = todas.Where(t => t.Tipo == TipoDeTransacao.CompraNoCartao)
            .Select(t => (t.Banco, Vencimento: VencimentoDe(t))).ToHashSet();
        var pagas = new HashSet<int>();
        var marcasPagas = new HashSet<string>();
        foreach (var marca in marcas.Where(m => Vale(m, faturas)).OrderBy(m => m.Data))
        {
            var (antes, depois) = Papel(marca) == "total" ? (25, 10) : (5, 5);
            var escolhida = Enumerable.Range(0, todas.Count)
                .Where(i => !pagas.Contains(i)
                    && todas[i].Tipo == TipoDeTransacao.Comum
                    && todas[i].Valor == -marca.Valor
                    && todas[i].Data >= marca.Data.AddDays(-antes)
                    && todas[i].Data <= marca.Data.AddDays(depois))
                .OrderByDescending(i => TextoNormalizado.ContemAlgum(todas[i].Descricao, TermosDeFatura))
                .ThenBy(i => Math.Abs(todas[i].Data.DayNumber - marca.Data.DayNumber))
                .Select(i => (int?)i)
                .FirstOrDefault();
            if (escolhida is { } indice)
            {
                pagas.Add(indice);
                marcasPagas.Add(marca.ChaveDeDeduplicacao);
            }
        }

        var conciliadas = todas
            .Select((t, i) => pagas.Contains(i) ? t with { Tipo = TipoDeTransacao.PagamentoDeFatura } : t)
            .Where((_, i) => todas[i].Tipo != TipoDeTransacao.PagamentoDeFatura)
            .ToList();
        return (conciliadas, marcasPagas);
    }

    /// <summary>Só vale se as compras que o pagamento quita estão no histórico; senão, o pagamento é o único registro do gasto.</summary>
    private static bool Vale(Transacao marca, HashSet<(Banco Banco, DateOnly? Vencimento)> faturas) =>
        VencimentoDe(marca) is { } vencimento
        && (Papel(marca) == "anterior"
            ? faturas.Any(f => f.Banco == marca.Banco && f.Vencimento < vencimento && f.Vencimento >= vencimento.AddDays(-45))
            : faturas.Contains((marca.Banco, vencimento)));

    internal static string? Papel(Transacao t) => Fatura.LerChave(t.IdExterno)?.Papel;

    internal static DateOnly? VencimentoDe(Transacao t) => Fatura.LerChave(t.IdExterno)?.Vencimento;
}

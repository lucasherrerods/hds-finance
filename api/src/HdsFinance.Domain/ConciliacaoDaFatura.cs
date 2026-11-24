using System.Globalization;

namespace HdsFinance.Domain;

/// <summary>
/// Evita contar o cartão duas vezes: o pagamento de uma fatura incluída deixa de ser gasto.
/// Reconhece pelo valor e pela data, então não depende do texto do extrato nem da ordem de importação.
/// </summary>
public static class ConciliacaoDaFatura
{
    private static readonly string[] TermosDeFatura = ["FATURA", "CARTAO"];

    public static IReadOnlyList<Transacao> Aplicar(IEnumerable<Transacao> transacoes)
    {
        var todas = transacoes.ToList();
        var marcas = todas.Where(t => t.Tipo == TipoDeTransacao.PagamentoDeFatura).ToList();
        if (marcas.Count == 0)
        {
            return todas;
        }

        var faturas = todas.Where(t => t.Tipo == TipoDeTransacao.CompraNoCartao).Select(VencimentoDe).OfType<DateOnly>().ToHashSet();
        var pagas = new HashSet<int>();
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
            }
        }

        return todas
            .Select((t, i) => pagas.Contains(i) ? t with { Tipo = TipoDeTransacao.PagamentoDeFatura } : t)
            .Where((_, i) => todas[i].Tipo != TipoDeTransacao.PagamentoDeFatura)
            .ToList();
    }

    /// <summary>Só vale se as compras que o pagamento quita estão no histórico; senão, o pagamento é o único registro do gasto.</summary>
    private static bool Vale(Transacao marca, HashSet<DateOnly> faturas) =>
        VencimentoDe(marca) is { } vencimento
        && (Papel(marca) == "anterior"
            ? faturas.Any(f => f < vencimento && f >= vencimento.AddDays(-45))
            : faturas.Contains(vencimento));

    private static string? Papel(Transacao t) => t.IdExterno?.Split('|') is [Fatura.PrefixoDaChave, _, var papel, _] ? papel : null;

    private static DateOnly? VencimentoDe(Transacao t) =>
        t.IdExterno?.Split('|') is [Fatura.PrefixoDaChave, var data, _, _]
        && DateOnly.TryParseExact(data, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var vencimento)
            ? vencimento
            : null;
}

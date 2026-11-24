using System.Globalization;
using System.Text.RegularExpressions;

namespace HdsFinance.Domain;

/// <summary>Compra é negativa; pagamento e estorno são positivos.</summary>
public sealed record LinhaDaFatura(DateOnly Data, string Descricao, decimal Valor)
{
    public bool EhPagamento => Valor > 0
        && TextoNormalizado.ContemAlgum(Descricao, ["PAGTO", "PAGAMENTO"]);
}

public sealed record CartaoDaFatura(decimal TotalDasCompras, IReadOnlyList<LinhaDaFatura> Linhas);

/// <summary>Uma fatura do cartão, com os números que o próprio documento informa para conferência.</summary>
public sealed partial record Fatura(
    DateOnly Vencimento, decimal Despesas, decimal Juros, decimal Antecipado, decimal Total, IReadOnlyList<CartaoDaFatura> Cartoes)
{
    public const string PrefixoDaChave = "fatura";

    /// <summary>Compras somam o total de cada cartão, os cartões somam as despesas, e o total da fatura fecha.</summary>
    public bool Confere() =>
        Cartoes.All(c => -c.Linhas.Where(l => l.Valor < 0).Sum(l => l.Valor) == c.TotalDasCompras)
        && Cartoes.Sum(c => c.TotalDasCompras) == Despesas
        && (Total == Despesas - Antecipado || JurosForaDasDespesas)
        && InicioDosAntecipados(Creditos()) is not null;

    private bool JurosForaDasDespesas => Juros > 0 && Total == Despesas + Juros - Antecipado;

    /// <summary>
    /// As compras e, junto delas, as marcas de pagamento que a <see cref="ConciliacaoDaFatura"/> usa
    /// para achar no extrato da conta o dinheiro que pagou a fatura.
    /// </summary>
    public IReadOnlyList<Transacao> ParaTransacoes()
    {
        var linhas = Cartoes.SelectMany(c => c.Linhas).ToList();
        var transacoes = linhas
            .Select((linha, i) => (linha, i))
            .Where(x => !x.linha.EhPagamento)
            .Select(x => new Transacao(MesDaCobranca(x.linha), x.linha.Valor, x.linha.Descricao, TipoDeTransacao.CompraNoCartao, Chave("compra", x.i)))
            .ToList();

        if (JurosForaDasDespesas)
        {
            transacoes.Add(new Transacao(Vencimento, -Juros, "Juros e encargos da fatura", TipoDeTransacao.CompraNoCartao, Chave("juros", 0)));
        }

        if (Total > 0)
        {
            transacoes.Add(Marca(Vencimento, Total, "total", 0));
        }

        var creditos = Creditos();
        var inicio = InicioDosAntecipados(creditos) ?? creditos.Count;
        transacoes.AddRange(creditos
            .Select((credito, i) => (credito, i))
            .Where(x => x.credito.EhPagamento)
            .Select(x => Marca(x.credito.Data, x.credito.Valor, x.i >= inicio ? "antecipado" : "anterior", x.i)));
        return transacoes;
    }

    private Transacao Marca(DateOnly data, decimal valor, string papel, int indice) =>
        new(data, valor, "Pagamento da fatura", TipoDeTransacao.PagamentoDeFatura, Chave(papel, indice));

    // O índice da linha separa compras iguais e se repete ao ler o mesmo arquivo.
    private string Chave(string papel, int indice) => string.Join('|', PrefixoDaChave,
        Vencimento.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), papel, indice.ToString(CultureInfo.InvariantCulture));

    private List<LinhaDaFatura> Creditos() =>
        Cartoes.SelectMany(c => c.Linhas).Where(l => l.Valor > 0).OrderBy(l => l.Data).ToList();

    /// <summary>Os créditos mais recentes abatem esta fatura e somam o antecipado; os de antes pagaram a anterior.</summary>
    private int? InicioDosAntecipados(List<LinhaDaFatura> creditos)
    {
        var soma = 0m;
        for (var i = creditos.Count; i >= 0; i--)
        {
            if (i < creditos.Count)
            {
                soma += creditos[i].Valor;
            }

            if (soma == Antecipado)
            {
                return i;
            }
        }

        return null;
    }

    /// <summary>A parcela 3 de uma compra de julho é cobrada em setembro.</summary>
    private static DateOnly MesDaCobranca(LinhaDaFatura linha) =>
        FormatoDaParcela().Match(linha.Descricao) is { Success: true } parcela
            ? linha.Data.AddMonths(int.Parse(parcela.Groups[1].Value, CultureInfo.InvariantCulture) - 1)
            : linha.Data;

    [GeneratedRegex(@"\(Parcela (\d{1,3}) de \d{1,3}\)", RegexOptions.IgnoreCase)]
    private static partial Regex FormatoDaParcela();
}

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
    private const string PrefixoDoInter = "fatura";
    private const string PrefixoDoNubank = "fatura-nubank";
    private const int DiasDeUmCiclo = 45;

    public Banco Banco { get; init; } = Banco.Inter;

    /// <summary>O CSV do Nubank só traz as linhas: o total é a soma delas, então não há com o que conferir.</summary>
    public static Fatura DoNubank(DateOnly vencimento, IReadOnlyList<LinhaDaFatura> linhas)
    {
        var compras = -linhas.Where(l => l.Valor < 0).Sum(l => l.Valor);
        var estornos = linhas.Where(l => l.Valor > 0 && !l.EhPagamento).Sum(l => l.Valor);
        return new Fatura(vencimento, compras, Juros: 0m, Antecipado: 0m, compras - estornos, [new CartaoDaFatura(compras, linhas)]) { Banco = Banco.Nubank };
    }

    /// <summary>Compras somam o total de cada cartão, os cartões somam as despesas, e o total da fatura fecha.</summary>
    public bool Confere() => Banco == Banco.Nubank || OsTotaisFecham();

    private bool OsTotaisFecham() =>
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
            .Select(x => new Transacao(MesDaCobranca(x.linha), x.linha.Valor, x.linha.Descricao, TipoDeTransacao.CompraNoCartao, Chave("compra", x.i)) { Banco = Banco })
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
        new(data, valor, "Pagamento da fatura", TipoDeTransacao.PagamentoDeFatura, Chave(papel, indice)) { Banco = Banco };

    // O índice da linha separa compras iguais e se repete ao ler o mesmo arquivo.
    private string Chave(string papel, int indice) => string.Join('|', Banco == Banco.Nubank ? PrefixoDoNubank : PrefixoDoInter,
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

    /// <summary>A chave de uma transação que veio de fatura, aberta: vencimento e papel.</summary>
    internal static (DateOnly Vencimento, string Papel)? LerChave(string? chave) =>
        chave?.Split('|') is [PrefixoDoInter or PrefixoDoNubank, var data, var papel, _]
        && DateOnly.TryParseExact(data, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var vencimento)
            ? (vencimento, papel)
            : null;

    /// <summary>A parcela 3 de uma compra de julho é cobrada em setembro.</summary>
    private DateOnly MesDaCobranca(LinhaDaFatura linha)
    {
        // O Nubank pode já datar a parcela no ciclo da fatura; aí não há o que mover.
        var mover = Banco == Banco.Inter || linha.Data < Vencimento.AddDays(-DiasDeUmCiclo);
        return mover && FormatoDaParcela().Match(linha.Descricao) is { Success: true } parcela
            ? linha.Data.AddMonths(int.Parse(parcela.Groups[1].Value, CultureInfo.InvariantCulture) - 1)
            : linha.Data;
    }

    [GeneratedRegex(@"\bParcela (\d{1,3})\s*(?:de|/)\s*\d{1,3}\b", RegexOptions.IgnoreCase)]
    private static partial Regex FormatoDaParcela();
}

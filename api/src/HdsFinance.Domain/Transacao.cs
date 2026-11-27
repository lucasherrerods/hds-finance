using System.Globalization;

namespace HdsFinance.Domain;

public enum Banco
{
    Inter,
    Nubank,
}

public enum TipoDeTransacao
{
    Comum,
    TransferenciaEntreContasProprias,
    MovimentacaoDeInvestimento,

    /// <summary>É gasto no dia da compra, mas não mexe no saldo: o dinheiro sai no pagamento da fatura.</summary>
    CompraNoCartao,

    /// <summary>Sai da conta, mas não é gasto: as compras da fatura já contaram.</summary>
    PagamentoDeFatura,
}

/// <summary>Valor positivo é entrada, negativo é saída.</summary>
public sealed record Transacao(
    DateOnly Data,
    decimal Valor,
    string Descricao,
    TipoDeTransacao Tipo,
    string? IdExterno = null)
{
    /// <summary>Escolhida só para esta transação; vence as regras e as correções por descrição.</summary>
    public string? Categoria { get; init; }

    /// <summary>Fora de todas as somas. O saldo da conta ainda conta com ela, porque o dinheiro se moveu.</summary>
    public bool Oculta { get; init; }

    /// <summary>A escolha da pessoa vence a descrição: só ela sabe que um Pix comum era um empréstimo, ou o contrário.</summary>
    public bool EhEmprestimoRecebido => Tipo == TipoDeTransacao.Comum && Valor > 0
        && (Categoria is { } escolhida ? escolhida == Emprestimo.Categoria : Emprestimo.NaDescricao(Descricao));

    public bool ContaNoFluxoDeCaixa => !Oculta && !EhEmprestimoRecebido && Tipo is (TipoDeTransacao.Comum or TipoDeTransacao.CompraNoCartao);

    public Banco Banco { get; init; } = Banco.Inter;

    /// <summary>O saldo acompanhado é o da conta do Inter; os outros bancos entram só nas somas.</summary>
    public bool MexeNoSaldo => Banco == Banco.Inter && Tipo != TipoDeTransacao.CompraNoCartao;

    /// <summary>Estorno no cartão também entra aqui: é valor positivo que abate o gasto, não receita.</summary>
    public bool EhGasto => !Oculta && (Tipo == TipoDeTransacao.CompraNoCartao || (Tipo == TipoDeTransacao.Comum && Valor < 0));

    /// <summary>
    /// Posição entre as transações iguais (mesmo dia, valor e descrição) do mesmo arquivo.
    /// Sem ela, dois pedágios iguais no mesmo dia virariam um só.
    /// </summary>
    public int Ocorrencia { get; init; } = 1;

    public string ChaveDeDeduplicacao =>
        IdExterno ?? (Ocorrencia > 1 ? $"{ChaveSemOcorrencia}|{Ocorrencia}" : ChaveSemOcorrencia);

    private string ChaveSemOcorrencia => string.Join('|',
        Data.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        Valor.ToString("0.00", CultureInfo.InvariantCulture),
        TextoNormalizado.De(Descricao));

    /// <summary>A primeira de cada grupo fica com a chave de antes, para o que já foi importado não duplicar.</summary>
    public static IReadOnlyList<Transacao> NumerarRepetidas(IEnumerable<Transacao> transacoes)
    {
        var vistas = new Dictionary<string, int>();
        return transacoes.Select(t =>
        {
            if (t.IdExterno is not null)
            {
                return t;
            }

            var ocorrencia = vistas[t.ChaveSemOcorrencia] = vistas.GetValueOrDefault(t.ChaveSemOcorrencia) + 1;
            return t with { Ocorrencia = ocorrencia };
        }).ToList();
    }
}

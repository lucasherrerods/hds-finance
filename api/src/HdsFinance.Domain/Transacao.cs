using System.Globalization;

namespace HdsFinance.Domain;

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

    public bool ContaNoFluxoDeCaixa => !Oculta && Tipo is (TipoDeTransacao.Comum or TipoDeTransacao.CompraNoCartao);

    public bool MexeNoSaldo => Tipo != TipoDeTransacao.CompraNoCartao;

    /// <summary>Estorno no cartão também entra aqui: é valor positivo que abate o gasto, não receita.</summary>
    public bool EhGasto => !Oculta && (Tipo == TipoDeTransacao.CompraNoCartao || (Tipo == TipoDeTransacao.Comum && Valor < 0));

    public string ChaveDeDeduplicacao =>
        IdExterno ?? string.Join('|',
            Data.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Valor.ToString("0.00", CultureInfo.InvariantCulture),
            TextoNormalizado.De(Descricao));
}

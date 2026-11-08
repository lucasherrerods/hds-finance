using System.Globalization;

namespace HdsFinance.Domain;

public enum TipoDeTransacao
{
    Comum,
    TransferenciaEntreContasProprias,
    MovimentacaoDeInvestimento,
}

/// <summary>Valor positivo é entrada, negativo é saída.</summary>
public sealed record Transacao(
    DateOnly Data,
    decimal Valor,
    string Descricao,
    TipoDeTransacao Tipo,
    string? IdExterno = null)
{
    public bool ContaNoFluxoDeCaixa => Tipo == TipoDeTransacao.Comum;

    public string ChaveDeDeduplicacao =>
        IdExterno ?? string.Join('|',
            Data.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Valor.ToString("0.00", CultureInfo.InvariantCulture),
            TextoNormalizado.De(Descricao));
}

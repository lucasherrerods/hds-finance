using System.Globalization;
using System.Text;

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
            Normalizar(Descricao));

    private static string Normalizar(string texto)
    {
        var semAcento = new StringBuilder();
        foreach (var c in texto.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                semAcento.Append(c);
            }
        }

        var palavras = semAcento.ToString().ToUpperInvariant()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return string.Join(' ', palavras);
    }
}

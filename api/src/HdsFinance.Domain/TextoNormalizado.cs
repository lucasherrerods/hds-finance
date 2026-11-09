using System.Globalization;
using System.Text;

namespace HdsFinance.Domain;

/// <summary>Maiúsculas, sem acentos e com um espaço só entre as palavras.</summary>
internal static class TextoNormalizado
{
    public static string De(string texto)
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

    /// <summary>
    /// Para comparar com regras: além de normalizar, troca pontuação por espaço, para "IFD*IFOOD" e
    /// "NETFLIX.COM" virarem palavras. Fica separado de <see cref="De"/> porque ele forma a chave de
    /// deduplicação, que não pode mudar para transações já guardadas.
    /// </summary>
    public static string ParaComparar(string texto)
    {
        var normalizado = De(texto);
        var limpo = new StringBuilder(normalizado.Length);
        foreach (var c in normalizado)
        {
            limpo.Append(char.IsLetterOrDigit(c) ? c : ' ');
        }

        return string.Join(' ', limpo.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    /// <summary>Termos já passados por <see cref="ParaComparar"/>, comparados como palavras inteiras.</summary>
    public static bool ContemAlgum(string texto, IEnumerable<string> termos)
    {
        var comBordas = $" {ParaComparar(texto)} ";
        return termos.Any(t => comBordas.Contains($" {t} ", StringComparison.Ordinal));
    }
}

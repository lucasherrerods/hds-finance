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

    /// <summary>Termos já normalizados, comparados como palavras inteiras.</summary>
    public static bool ContemAlgum(string texto, IEnumerable<string> termosNormalizados)
    {
        var comBordas = $" {De(texto)} ";
        return termosNormalizados.Any(t => comBordas.Contains($" {t} ", StringComparison.Ordinal));
    }
}

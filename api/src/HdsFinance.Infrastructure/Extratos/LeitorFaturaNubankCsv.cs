using System.Globalization;
using System.Text.RegularExpressions;
using HdsFinance.Application.Admin;
using HdsFinance.Domain;

namespace HdsFinance.Infrastructure.Extratos;

/// <summary>A fatura do Nubank em CSV. O vencimento só existe no nome do arquivo: Nubank_2024-06-22.csv.</summary>
internal static partial class LeitorFaturaNubankCsv
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    public static ResultadoDaLeituraDeFatura Ler(byte[] conteudo, string nomeDoArquivo)
    {
        var linhas = TextoDoExtrato.Ler(conteudo).Split('\n').Select(l => l.TrimEnd('\r')).ToArray();
        var colunas = linhas[0].Trim().ToLowerInvariant().Split(',');
        var (data, titulo, valor) = (Array.IndexOf(colunas, "date"), Array.IndexOf(colunas, "title"), Array.IndexOf(colunas, "amount"));
        if (data < 0 || titulo < 0 || valor < 0)
        {
            return new ResultadoDaLeituraDeFatura.Invalida("O CSV não parece uma fatura do Nubank.");
        }

        if (VencimentoNoNome(nomeDoArquivo) is not { } vencimento)
        {
            return new ResultadoDaLeituraDeFatura.Invalida("O nome do arquivo precisa ter a data da fatura, como Nubank_2024-06-22.csv.");
        }

        var lidas = new List<LinhaDaFatura>();
        for (var i = 1; i < linhas.Length; i++)
        {
            if (string.IsNullOrWhiteSpace(linhas[i]))
            {
                continue;
            }

            var campos = LinhaDeCsv.Separar(linhas[i]);
            if (campos.Count < colunas.Length
                || !DateOnly.TryParseExact(campos[data].Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dia)
                || LerValor(campos[valor]) is not { } quanto)
            {
                return new ResultadoDaLeituraDeFatura.Invalida($"Linha {i + 1} da fatura inválida.");
            }

            // No arquivo a compra é positiva; aqui gasto é negativo.
            lidas.Add(new LinhaDaFatura(dia, LeitorFaturaInterPdf.TextoLimpo(campos[titulo]), -quanto));
        }

        return lidas.Count == 0
            ? new ResultadoDaLeituraDeFatura.Invalida("A fatura não tem lançamentos.")
            : new ResultadoDaLeituraDeFatura.Lida(Fatura.DoNubank(vencimento, lidas));
    }

    /// <summary>Já veio como 12.99, "12,99", "1.000,50" e "- 32,82".</summary>
    private static decimal? LerValor(string texto)
    {
        var limpo = texto.Replace(" ", string.Empty);
        var cultura = limpo.Contains(',') ? PtBr : CultureInfo.InvariantCulture;
        return decimal.TryParse(limpo, NumberStyles.Number | NumberStyles.AllowLeadingSign, cultura, out var valor) ? valor : null;
    }

    private static DateOnly? VencimentoNoNome(string nome) =>
        DataNoNome().Match(nome) is { Success: true } m
        && DateOnly.TryParseExact($"{m.Groups[1].Value}-{(m.Groups[2].Success ? m.Groups[2].Value : "01")}", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var data)
            ? data
            : null;

    [GeneratedRegex(@"(\d{4}-\d{2})(?:-(\d{2}))?")]
    private static partial Regex DataNoNome();
}

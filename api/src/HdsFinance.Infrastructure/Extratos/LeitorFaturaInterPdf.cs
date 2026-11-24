using System.Globalization;
using System.Text.RegularExpressions;
using HdsFinance.Application.Admin;
using HdsFinance.Domain;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Exceptions;

namespace HdsFinance.Infrastructure.Extratos;

/// <summary>
/// Lê o PDF da fatura do cartão Inter. O documento desalinha a coluna de valores das descrições, então as duas
/// são lidas em ordem e casadas uma a uma; a conferência com os totais pega qualquer desencontro.
/// </summary>
public sealed partial class LeitorFaturaInterPdf : ILeitorDeFatura
{
    private const string NaoEhFatura = "O arquivo não parece uma fatura do cartão Inter.";
    private const double FolgaDaLinha = 3;
    private static readonly string[] Meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

    public ResultadoDaLeituraDeFatura Ler(byte[] conteudo, string? senha)
    {
        try
        {
            using var documento = PdfDocument.Open(conteudo, new ParsingOptions { Password = senha ?? string.Empty });
            return Interpretar(documento.GetPages().SelectMany(Linhas).ToList());
        }
        catch (PdfDocumentEncryptedException)
        {
            return new ResultadoDaLeituraDeFatura.SenhaNecessaria();
        }
        catch (Exception erro) when (erro is not OutOfMemoryException)
        {
            // A biblioteca lança tipos variados para PDF quebrado, e a mensagem dela pode citar o conteúdo.
            return new ResultadoDaLeituraDeFatura.Invalida("Não foi possível ler o PDF.");
        }
    }

    private static IEnumerable<string> Linhas(Page pagina)
    {
        var atual = new List<Word>();
        foreach (var palavra in pagina.GetWords().OrderByDescending(p => p.BoundingBox.Bottom))
        {
            if (atual.Count > 0 && atual[0].BoundingBox.Bottom - palavra.BoundingBox.Bottom > FolgaDaLinha)
            {
                yield return Juntar(atual);
                atual.Clear();
            }

            atual.Add(palavra);
        }

        if (atual.Count > 0)
        {
            yield return Juntar(atual);
        }
    }

    private static string Juntar(List<Word> palavras) =>
        string.Join(' ', palavras.OrderBy(p => p.BoundingBox.Left).Select(p => p.Text));

    private static ResultadoDaLeituraDeFatura Interpretar(List<string> linhas)
    {
        var vencimento = linhas.Select(l => DataCurta().Match(l)).FirstOrDefault(m => m.Success);
        var resumo = linhas.SkipWhile(l => !l.Contains("Descritivo detalhado", StringComparison.OrdinalIgnoreCase))
            .TakeWhile(l => !l.Contains("Despesas da fatura", StringComparison.OrdinalIgnoreCase))
            .Where(l => !DataCurta().IsMatch(l))
            .SelectMany(Valores)
            .Take(4)
            .ToList();
        if (vencimento is null || resumo.Count < 4
            || !DateOnly.TryParseExact(vencimento.Value, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var data))
        {
            return new ResultadoDaLeituraDeFatura.Invalida(NaoEhFatura);
        }

        var compras = linhas.SkipWhile(l => !l.Contains("Despesas da fatura", StringComparison.OrdinalIgnoreCase)).Skip(1)
            .TakeWhile(l => !FimDasCompras().IsMatch(l));
        return LerCartoes(compras) is { } cartoes
            ? new ResultadoDaLeituraDeFatura.Lida(new Fatura(data, resumo[0], resumo[1], resumo[2], resumo[3], cartoes))
            : new ResultadoDaLeituraDeFatura.Invalida("O formato das compras desta fatura não foi reconhecido.");
    }

    private static List<CartaoDaFatura>? LerCartoes(IEnumerable<string> linhas)
    {
        var cartoes = new List<CartaoDaFatura>();
        var movimentos = new List<(DateOnly Data, string Descricao)>();
        var valores = new List<decimal>();
        foreach (var linha in linhas)
        {
            // O cabeçalho repetido em cada página traz vencimento e total; não é compra.
            if (DataCurta().IsMatch(linha))
            {
                continue;
            }

            if (InicioDeCartao().IsMatch(linha) && (movimentos.Count > 0 || valores.Count > 0))
            {
                if (!Fechar())
                {
                    return null;
                }
            }

            valores.AddRange(Valores(linha));
            var texto = Valor().Replace(linha, string.Empty).TrimEnd(' ', '-');
            if (Movimento().Match(texto) is { Success: true } m && LerData(m) is { } data)
            {
                movimentos.Add((data, m.Groups["descricao"].Value.Trim()));
            }
            else if (movimentos.Count > 0 && SobraDaParcela().IsMatch(texto))
            {
                movimentos[^1] = (movimentos[^1].Data, $"{movimentos[^1].Descricao} {texto.Trim()}");
            }
        }

        if (movimentos.Count > 0 || valores.Count > 0)
        {
            return Fechar() ? cartoes : null;
        }

        return cartoes;

        // Cada compra tem um valor, e o último valor do cartão é o total dele.
        bool Fechar()
        {
            if (valores.Count != movimentos.Count + 1)
            {
                return false;
            }

            cartoes.Add(new CartaoDaFatura(
                valores[^1], movimentos.Select((m, i) => new LinhaDaFatura(m.Data, m.Descricao, -valores[i])).ToList()));
            movimentos.Clear();
            valores.Clear();
            return true;
        }
    }

    /// <summary>Como no papel: compra positiva, crédito ("+ R$") negativo.</summary>
    private static IEnumerable<decimal> Valores(string linha) => Valor().Matches(linha).Select(m =>
        decimal.Parse(m.Groups["numero"].Value.Replace(".", string.Empty).Replace(',', '.'), CultureInfo.InvariantCulture)
        * (m.Groups["credito"].Success ? -1 : 1));

    private static DateOnly? LerData(Match m)
    {
        var mes = Array.IndexOf(Meses, m.Groups["mes"].Value.ToLowerInvariant()) + 1;
        var texto = $"{m.Groups["ano"].Value}-{mes:00}-{m.Groups["dia"].Value}";
        return DateOnly.TryParseExact(texto, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var data) ? data : null;
    }

    [GeneratedRegex(@"\b\d{2}/\d{2}/\d{4}\b")]
    private static partial Regex DataCurta();

    [GeneratedRegex(@"(?<credito>\+\s*)?R\$\s*(?<numero>\d{1,3}(?:\.\d{3})*,\d{2})")]
    private static partial Regex Valor();

    [GeneratedRegex(@"^(?<dia>\d{2}) de (?<mes>[a-z]{3})[a-z]*\.? (?<ano>\d{4})\s+(?<descricao>.+)$", RegexOptions.IgnoreCase)]
    private static partial Regex Movimento();

    [GeneratedRegex(@"Pr[óo]xima fatura|^Limite de cr[ée]dito total", RegexOptions.IgnoreCase)]
    private static partial Regex FimDasCompras();

    [GeneratedRegex(@"^CART[ÃA]O\s+\S*\*")]
    private static partial Regex InicioDeCartao();

    [GeneratedRegex(@"^(\(?Parcela\b.*|(\d{2} )?(de )?\d{2}\))$", RegexOptions.IgnoreCase)]
    private static partial Regex SobraDaParcela();
}

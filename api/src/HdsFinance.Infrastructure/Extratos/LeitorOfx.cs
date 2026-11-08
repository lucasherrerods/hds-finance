using System.Globalization;
using System.Text.RegularExpressions;
using HdsFinance.Application.Extratos;
using HdsFinance.Domain;

namespace HdsFinance.Infrastructure.Extratos;

public sealed partial class LeitorOfx : ILeitorDeExtrato
{
    public FormatoDeExtrato Formato => FormatoDeExtrato.Ofx;

    public async Task<ResultadoDaLeitura> LerAsync(Stream conteudo, CancellationToken cancelamento = default)
    {
        var texto = await TextoDoExtrato.LerAsync(conteudo, cancelamento);
        var blocos = BlocoDeTransacao().Matches(texto);
        if (blocos.Count == 0)
        {
            return new ResultadoDaLeitura.Falha(1, "Nenhuma transação encontrada no OFX.");
        }

        var transacoes = new List<Transacao>(blocos.Count);
        foreach (Match bloco in blocos)
        {
            var campos = Campo().Matches(bloco.Groups[1].Value)
                .GroupBy(c => c.Groups[1].Value.ToUpperInvariant())
                .ToDictionary(g => g.Key, g => g.First());

            int LinhaDo(string tag) => TextoDoExtrato.LinhaDaPosicao(
                texto, bloco.Groups[1].Index + (campos.TryGetValue(tag, out var c) ? c.Index : 0));

            string? Valor(string tag) => campos.TryGetValue(tag, out var c) ? c.Groups[2].Value.Trim() : null;

            var data = Valor("DTPOSTED");
            if (data is null || data.Length < 8 ||
                !DateOnly.TryParseExact(data[..8], "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dia))
            {
                return new ResultadoDaLeitura.Falha(LinhaDo("DTPOSTED"), "Data da transação inválida.");
            }

            var valorTexto = Valor("TRNAMT")?.Replace(',', '.');
            if (!decimal.TryParse(valorTexto, NumberStyles.Number | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out var valor))
            {
                return new ResultadoDaLeitura.Falha(LinhaDo("TRNAMT"), "Valor da transação inválido.");
            }

            var descricao = Valor("MEMO") is { Length: > 0 } memo ? memo : Valor("NAME") ?? string.Empty;
            var id = Valor("FITID") is { Length: > 0 } fitid ? fitid : null;

            transacoes.Add(new Transacao(dia, valor, descricao, TipoDeTransacao.Comum, id));
        }

        return new ResultadoDaLeitura.Sucesso(transacoes, SaldoFinal(texto));
    }

    [GeneratedRegex(@"<STMTTRN>(.*?)</STMTTRN>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex BlocoDeTransacao();

    [GeneratedRegex(@"<(\w+)>([^<\r\n]*)")]
    private static partial Regex Campo();

    private static decimal? SaldoFinal(string texto) =>
        SaldoDoLedger().Match(texto) is { Success: true } saldo &&
        decimal.TryParse(saldo.Groups[1].Value.Trim().Replace(',', '.'), NumberStyles.Number | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out var valor)
            ? valor
            : null;

    [GeneratedRegex(@"<LEDGERBAL>.*?<BALAMT>([^<\r\n]*)", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex SaldoDoLedger();
}

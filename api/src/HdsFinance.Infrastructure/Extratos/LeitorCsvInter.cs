using System.Globalization;
using HdsFinance.Application.Extratos;
using HdsFinance.Domain;

namespace HdsFinance.Infrastructure.Extratos;

/// <summary>Extrato da conta corrente exportado pelo Inter: algumas linhas de resumo e depois a tabela.</summary>
public sealed class LeitorCsvInter : ILeitorDeExtrato
{
    private const string InicioDoCabecalho = "Data Lançamento";
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    public FormatoDeExtrato Formato => FormatoDeExtrato.Csv;

    public async Task<ResultadoDaLeitura> LerAsync(Stream conteudo, CancellationToken cancelamento = default)
    {
        var texto = await TextoDoExtrato.LerAsync(conteudo, cancelamento);
        var linhas = texto.Split('\n').Select(l => l.TrimEnd('\r')).ToArray();

        var cabecalho = Array.FindIndex(linhas, l => l.StartsWith(InicioDoCabecalho, StringComparison.OrdinalIgnoreCase));
        if (cabecalho < 0)
        {
            return new ResultadoDaLeitura.Falha(1, "Cabeçalho do extrato do Inter não encontrado.");
        }

        var transacoes = new List<Transacao>();
        var saldos = new List<decimal?>();
        for (var i = cabecalho + 1; i < linhas.Length; i++)
        {
            if (string.IsNullOrWhiteSpace(linhas[i]))
            {
                continue;
            }

            var numeroDaLinha = i + 1;
            var colunas = linhas[i].Split(';');
            if (colunas.Length < 4)
            {
                return new ResultadoDaLeitura.Falha(numeroDaLinha, "Linha com colunas faltando.");
            }

            if (!DateOnly.TryParseExact(colunas[0].Trim(), "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var data))
            {
                return new ResultadoDaLeitura.Falha(numeroDaLinha, "Data da transação inválida.");
            }

            if (!decimal.TryParse(colunas[3].Trim(), NumberStyles.Number | NumberStyles.AllowLeadingSign, PtBr, out var valor))
            {
                return new ResultadoDaLeitura.Falha(numeroDaLinha, "Valor da transação inválido.");
            }

            var descricao = $"{colunas[1].Trim()} {colunas[2].Trim()}".Trim();
            transacoes.Add(new Transacao(data, valor, descricao, TipoDeTransacao.Comum));
            saldos.Add(colunas.Length > 4 &&
                decimal.TryParse(colunas[4].Trim(), NumberStyles.Number | NumberStyles.AllowLeadingSign, PtBr, out var saldo)
                    ? saldo
                    : null);
        }

        return transacoes.Count == 0
            ? new ResultadoDaLeitura.Falha(cabecalho + 1, "Nenhuma transação encontrada no CSV.")
            : new ResultadoDaLeitura.Sucesso(transacoes, SaldoFinal(transacoes, saldos), FimDoPeriodo(linhas[..cabecalho]));
    }

    // O resumo antes da tabela traz "Período ;01/10/2026 a 31/10/2026".
    private static DateOnly? FimDoPeriodo(IEnumerable<string> resumo)
    {
        var periodo = resumo.FirstOrDefault(l => l.StartsWith("Período", StringComparison.OrdinalIgnoreCase));
        var fim = periodo?.Split(" a ", StringSplitOptions.TrimEntries).LastOrDefault();
        return fim is not null && DateOnly.TryParseExact(fim, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dia)
            ? dia
            : null;
    }

    // Cada linha traz o saldo depois dela. A ordem do arquivo (crescente ou decrescente)
    // é descoberta pelos próprios saldos; se eles não fecham em nenhuma das duas, o saldo fica desconhecido.
    private static decimal? SaldoFinal(List<Transacao> transacoes, List<decimal?> saldos)
    {
        if (saldos.Any(s => s is null))
        {
            return null;
        }

        if (saldos.Count == 1)
        {
            return saldos[0];
        }

        var crescente = Enumerable.Range(1, saldos.Count - 1)
            .All(i => saldos[i - 1] + transacoes[i].Valor == saldos[i]);
        if (crescente)
        {
            return saldos[^1];
        }

        var decrescente = Enumerable.Range(0, saldos.Count - 1)
            .All(i => saldos[i + 1] + transacoes[i].Valor == saldos[i]);
        return decrescente ? saldos[0] : null;
    }
}

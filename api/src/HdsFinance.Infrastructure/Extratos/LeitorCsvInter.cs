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
        }

        return transacoes.Count == 0
            ? new ResultadoDaLeitura.Falha(cabecalho + 1, "Nenhuma transação encontrada no CSV.")
            : new ResultadoDaLeitura.Sucesso(transacoes);
    }
}

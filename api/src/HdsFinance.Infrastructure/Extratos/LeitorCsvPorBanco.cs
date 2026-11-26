using System.Globalization;
using System.Text.RegularExpressions;
using HdsFinance.Application.Extratos;
using HdsFinance.Domain;

namespace HdsFinance.Infrastructure.Extratos;

/// <summary>Reconhece pelo cabeçalho se o CSV é da conta do Nubank; senão, é do Inter.</summary>
public sealed partial class LeitorCsvPorBanco : ILeitorDeExtrato
{
    private const string CabecalhoDoNubank = "Data,Valor,Identificador,";
    private readonly LeitorCsvInter _inter = new();

    public FormatoDeExtrato Formato => FormatoDeExtrato.Csv;

    public async Task<ResultadoDaLeitura> LerAsync(Stream conteudo, CancellationToken cancelamento = default)
    {
        using var memoria = new MemoryStream();
        await conteudo.CopyToAsync(memoria, cancelamento);
        var texto = TextoDoExtrato.Ler(memoria.ToArray());
        if (texto.StartsWith(CabecalhoDoNubank, StringComparison.OrdinalIgnoreCase))
        {
            return LerNubank(texto);
        }

        memoria.Position = 0;
        return await _inter.LerAsync(memoria, cancelamento);
    }

    private static ResultadoDaLeitura LerNubank(string texto)
    {
        var linhas = texto.Split('\n').Select(l => l.TrimEnd('\r')).ToArray();
        var transacoes = new List<Transacao>();
        for (var i = 1; i < linhas.Length; i++)
        {
            if (string.IsNullOrWhiteSpace(linhas[i]))
            {
                continue;
            }

            var campos = LinhaDeCsv.Separar(linhas[i]);
            if (campos.Count < 4)
            {
                return new ResultadoDaLeitura.Falha(i + 1, "Linha com colunas faltando.");
            }

            if (!DateOnly.TryParseExact(campos[0].Trim(), "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var data))
            {
                return new ResultadoDaLeitura.Falha(i + 1, "Data da transação inválida.");
            }

            if (!decimal.TryParse(campos[1].Trim(), NumberStyles.Number | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out var valor))
            {
                return new ResultadoDaLeitura.Falha(i + 1, "Valor da transação inválido.");
            }

            // O valor entra na chave porque um estorno pode repetir o identificador da compra.
            var chave = string.Create(CultureInfo.InvariantCulture, $"nubank:{campos[2].Trim()}:{valor:0.00}");
            transacoes.Add(new Transacao(data, valor, SemDadosDeTerceiros(string.Join(',', campos.Skip(3))), TipoDeTransacao.Comum, chave) { Banco = Banco.Nubank });
        }

        return transacoes.Count == 0
            ? new ResultadoDaLeitura.Falha(1, "Nenhuma transação encontrada no extrato.")
            : new ResultadoDaLeitura.Sucesso(transacoes) { Banco = Banco.Nubank };
    }

    /// <summary>O Pix traz documento, agência e conta da outra pessoa, que não servem para nada aqui.</summary>
    private static string SemDadosDeTerceiros(string descricao) =>
        CpfNoNome().Replace(
            Documento().Replace(AgenciaEConta().Replace(LeitorFaturaInterPdf.TextoLimpo(descricao), string.Empty), string.Empty), string.Empty).Trim();

    // O nome de um MEI costuma terminar com o CPF do dono.
    [GeneratedRegex(@"\s*\b\d{11}\b")]
    private static partial Regex CpfNoNome();

    [GeneratedRegex(@"\s*Ag[êe]ncia:.*$", RegexOptions.IgnoreCase)]
    private static partial Regex AgenciaEConta();

    [GeneratedRegex(@" - (?:[•*\d]{3}\.[•*\d]{3}\.[•*\d]{3}-[•*\d]{2}|[•*\d]{2}\.[•*\d]{3}\.[•*\d]{3}/[•*\d]{4}-[•*\d]{2})(?= - |$)")]
    private static partial Regex Documento();
}

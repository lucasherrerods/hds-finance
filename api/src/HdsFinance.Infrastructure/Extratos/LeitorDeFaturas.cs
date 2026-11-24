using HdsFinance.Application.Admin;

namespace HdsFinance.Infrastructure.Extratos;

/// <summary>Escolhe o leitor pelo arquivo: CSV é do Nubank, PDF é do Inter.</summary>
public sealed class LeitorDeFaturas : ILeitorDeFatura
{
    private readonly LeitorFaturaInterPdf _inter = new();

    public ResultadoDaLeituraDeFatura Ler(byte[] conteudo, string nomeDoArquivo, string? senha) =>
        Path.GetExtension(nomeDoArquivo).Equals(".csv", StringComparison.OrdinalIgnoreCase)
            ? LeitorFaturaNubankCsv.Ler(conteudo, nomeDoArquivo)
            : _inter.Ler(conteudo, senha);
}

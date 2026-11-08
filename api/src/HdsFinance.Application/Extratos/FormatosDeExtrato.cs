namespace HdsFinance.Application.Extratos;

public static class FormatosDeExtrato
{
    public static FormatoDeExtrato? PeloNomeDoArquivo(string nome) =>
        Path.GetExtension(nome).ToLowerInvariant() switch
        {
            ".ofx" => FormatoDeExtrato.Ofx,
            ".csv" => FormatoDeExtrato.Csv,
            _ => null,
        };
}

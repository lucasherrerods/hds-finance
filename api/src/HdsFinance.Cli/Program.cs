using System.Globalization;
using HdsFinance.Application.Extratos;
using HdsFinance.Infrastructure.Extratos;
using HdsFinance.Infrastructure.Repositorios;

var ptBr = CultureInfo.GetCultureInfo("pt-BR");

if (args is not ["importar", var caminho])
{
    Console.Error.WriteLine("Uso: importar <caminho do extrato .ofx ou .csv>");
    return 2;
}

if (FormatosDeExtrato.PeloNomeDoArquivo(caminho) is not { } formato)
{
    Console.Error.WriteLine("Formato não suportado: use um arquivo .ofx ou .csv.");
    return 2;
}

if (!File.Exists(caminho))
{
    Console.Error.WriteLine("Arquivo não encontrado.");
    return 2;
}

var repositorio = new RepositorioEmMemoria();
var resumir = new ResumirExtrato(new ImportarExtrato([new LeitorOfx(), new LeitorCsvInter()], repositorio), repositorio);

await using var arquivo = File.OpenRead(caminho);

switch (await resumir.ExecutarAsync(arquivo, formato))
{
    case ResultadoDoResumo.NaoImportado { Motivo: ResultadoDaImportacao.ArquivoInvalido invalido }:
        Console.Error.WriteLine($"Arquivo inválido na linha {invalido.Linha}: {invalido.Motivo}");
        return 1;

    case ResultadoDoResumo.Resumido resumido:
        Console.WriteLine($"Transações lidas: {resumido.Importacao.Novas} (duplicadas ignoradas: {resumido.Importacao.Duplicadas})");
        foreach (var resumo in resumido.Meses)
        {
            Console.WriteLine();
            Console.WriteLine($"{resumo.Mes.Mes:00}/{resumo.Mes.Ano}");
            Console.WriteLine($"  Entradas:  {resumo.Entradas.ToString("C", ptBr)}");
            Console.WriteLine($"  Saídas:    {resumo.Saidas.ToString("C", ptBr)}");
            Console.WriteLine($"  Resultado: {resumo.Resultado.ToString("C", ptBr)}");
        }

        return 0;

    default:
        Console.Error.WriteLine("Formato não suportado.");
        return 2;
}

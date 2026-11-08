using System.Globalization;
using HdsFinance.Application.Extratos;
using HdsFinance.Domain;
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
var importar = new ImportarExtrato([new LeitorOfx(), new LeitorCsvInter()], repositorio);

await using var arquivo = File.OpenRead(caminho);
var resultado = await importar.ExecutarAsync(arquivo, formato);

switch (resultado)
{
    case ResultadoDaImportacao.ArquivoInvalido invalido:
        Console.Error.WriteLine($"Arquivo inválido na linha {invalido.Linha}: {invalido.Motivo}");
        return 1;
    case ResultadoDaImportacao.FormatoNaoSuportado:
        Console.Error.WriteLine("Formato não suportado.");
        return 2;
    case ResultadoDaImportacao.Importado importado:
        Console.WriteLine($"Transações lidas: {importado.Novas} (duplicadas ignoradas: {importado.Duplicadas})");
        break;
}

foreach (var resumo in ResumoMensal.PorMes(await repositorio.ListarAsync()))
{
    Console.WriteLine();
    Console.WriteLine($"{resumo.Mes.Mes:00}/{resumo.Mes.Ano}");
    Console.WriteLine($"  Entradas:  {resumo.Entradas.ToString("C", ptBr)}");
    Console.WriteLine($"  Saídas:    {resumo.Saidas.ToString("C", ptBr)}");
    Console.WriteLine($"  Resultado: {resumo.Resultado.ToString("C", ptBr)}");
}

return 0;

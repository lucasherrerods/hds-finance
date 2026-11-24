using System.Globalization;
using HdsFinance.Application.Extratos;
using HdsFinance.Application.Admin;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;
using HdsFinance.Infrastructure;
using HdsFinance.Infrastructure.Extratos;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

const string Uso = """
    Uso:
      importar <extrato .ofx ou .csv>
      conferir <fatura.pdf> [...]   (só lê e confere, sem gravar)
      relatorio [--mes AAAA-MM] [--saida arquivo.pdf] [--enviar] [--forcar]
    """;

var ptBr = CultureInfo.GetCultureInfo("pt-BR");

if (args is ["conferir", .. var faturas] && faturas.Length > 0)
{
    return Conferir(faturas);
}

var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings { ContentRootPath = AppContext.BaseDirectory });
builder.Configuration.AddUserSecrets(Composicao.IdDosSegredos);
builder.Logging.SetMinimumLevel(LogLevel.Warning);
builder.Services.AdicionarNucleo(builder.Configuration);
builder.Services.AdicionarAdmin(builder.Configuration);
using var host = builder.Build();
await host.Services.PrepararBancoAsync();
await using var escopo = host.Services.CreateAsyncScope();
var servicos = escopo.ServiceProvider;

return args switch
{
    ["importar", var caminho] => await ImportarAsync(caminho),
    ["relatorio", .. var opcoes] => await RelatorioAsync(opcoes),
    _ => Erro(Uso),
};

async Task<int> ImportarAsync(string caminho)
{
    if (FormatosDeExtrato.PeloNomeDoArquivo(caminho) is not { } formato)
    {
        return Erro("Formato não suportado: use um arquivo .ofx ou .csv.");
    }

    if (!File.Exists(caminho))
    {
        return Erro("Arquivo não encontrado.");
    }

    await using var arquivo = File.OpenRead(caminho);
    var resultado = await servicos.GetRequiredService<ProcessarExtratoRecebido>().ExecutarAsync(arquivo, formato);

    if (resultado.Importacao is ResultadoDaImportacao.ArquivoInvalido invalido)
    {
        return Erro($"Arquivo inválido na linha {invalido.Linha}: {invalido.Motivo}", 1);
    }

    if (resultado.Importacao is not ResultadoDaImportacao.Importado importado)
    {
        return Erro("Formato não suportado.");
    }

    Console.WriteLine($"Transações novas: {importado.Novas} (já existiam: {importado.Duplicadas})");
    foreach (var resumo in (await servicos.GetRequiredService<FecharMes>().MesesAsync()).TakeLast(3))
    {
        Console.WriteLine();
        Console.WriteLine($"{resumo.Mes}");
        Console.WriteLine($"  Entradas:  {resumo.Entradas.ToString("C", ptBr)}");
        Console.WriteLine($"  Saídas:    {resumo.Saidas.ToString("C", ptBr)}");
        Console.WriteLine($"  Resultado: {resumo.Resultado.ToString("C", ptBr)}");
        Console.WriteLine($"  Investimentos e transferências: {resumo.InvestimentosETransferencias.ToString("C", ptBr)}");
        Console.WriteLine($"  Saldo:     {Saldo(resumo.SaldoInicial)} → {Saldo(resumo.SaldoFinal)}");
    }

    Console.WriteLine();
    Console.WriteLine(TextoDoFechamento.De(resultado.Fechamento));
    return 0;
}

async Task<int> RelatorioAsync(string[] opcoes)
{
    MesDeReferencia? mes = null;
    string? saida = null;
    var enviar = false;
    var forcar = false;
    for (var i = 0; i < opcoes.Length; i++)
    {
        switch (opcoes[i])
        {
            case "--mes" when i + 1 < opcoes.Length:
                mes = MesDeReferencia.TentarLer(opcoes[++i]);
                if (mes is null)
                {
                    return Erro("Mês inválido: use AAAA-MM, por exemplo 2026-10.");
                }

                break;
            case "--saida" when i + 1 < opcoes.Length:
                saida = opcoes[++i];
                break;
            case "--enviar":
                enviar = true;
                break;
            case "--forcar":
                forcar = true;
                break;
            default:
                return Erro(Uso);
        }
    }

    var fechar = servicos.GetRequiredService<FecharMes>();
    if (await fechar.GerarAsync(mes) is not ResultadoDoRelatorio.Gerado gerado)
    {
        return Erro(mes is null ? "Nenhum mês importado ainda." : $"Nenhuma transação em {mes}.", 1);
    }

    saida ??= Path.Combine("relatorios", $"fechamento-{gerado.Mes}.pdf");
    Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(saida))!);
    await File.WriteAllBytesAsync(saida, gerado.Pdf);
    Console.WriteLine($"PDF salvo em {saida}");

    if (!enviar)
    {
        return 0;
    }

    var envio = await fechar.EnviarAsync(gerado.Mes, forcar);
    Console.WriteLine(TextoDoFechamento.De(envio));
    return envio is ResultadoDoFechamento.Enviado ? 0 : 1;
}

// Não mostra compras nem valores, só se a leitura fecha com o total.
int Conferir(string[] caminhos)
{
    Console.Write("Senha do PDF (Enter se não tiver): ");
    var senha = LerSenha();
    var leitor = new LeitorFaturaInterPdf();
    var falhas = 0;
    foreach (var caminho in caminhos)
    {
        var (ok, texto) = !File.Exists(caminho) ? (false, "arquivo não encontrado") : leitor.Ler(File.ReadAllBytes(caminho), senha) switch
        {
            ResultadoDaLeituraDeFatura.Lida { Fatura: var f } => (f.Confere(), $"{(f.Confere() ? "confere" : "NÃO confere")}, {f.Cartoes.Sum(c => c.Linhas.Count)} linhas"),
            ResultadoDaLeituraDeFatura.Invalida i => (false, i.Motivo),
            _ => (false, "senha errada ou ausente"),
        };
        falhas += ok ? 0 : 1;
        Console.WriteLine($"{Path.GetFileName(caminho)}: {texto}");
    }

    return falhas == 0 ? 0 : 1;
}

string LerSenha()
{
    var senha = new System.Text.StringBuilder();
    while (Console.ReadKey(intercept: true) is { Key: not ConsoleKey.Enter } tecla)
    {
        if (tecla.Key == ConsoleKey.Backspace)
        {
            senha.Length = Math.Max(0, senha.Length - 1);
        }
        else
        {
            senha.Append(tecla.KeyChar);
        }
    }

    Console.WriteLine();
    return senha.ToString();
}

int Erro(string mensagem, int codigo = 2)
{
    Console.Error.WriteLine(mensagem);
    return codigo;
}

string Saldo(decimal? valor) => valor?.ToString("C", ptBr) ?? "não informado";

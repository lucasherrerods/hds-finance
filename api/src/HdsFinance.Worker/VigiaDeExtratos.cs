using HdsFinance.Application.Extratos;
using HdsFinance.Application.ModoPessoal;
using Microsoft.Extensions.Options;

namespace HdsFinance.Worker;

public sealed class OpcoesDoWorker
{
    public string PastaDeExtratos { get; set; } =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "hds-finance", "extratos");
}

/// <summary>
/// Vigia a pasta de extratos. Cada arquivo que chega é importado e, se o mês ficou completo, o fechamento sai por e-mail.
/// Os logs dizem só quantas transações entraram e o que aconteceu com o mês, nunca valores, descrições ou o nome do arquivo.
/// </summary>
public sealed class VigiaDeExtratos(
    IServiceScopeFactory escopos, IOptions<OpcoesDoWorker> opcoes, ILogger<VigiaDeExtratos> log) : BackgroundService
{
    private static readonly TimeSpan EsperaEntreTentativas = TimeSpan.FromMilliseconds(500);
    private const int TentativasDeAbrir = 20;

    protected override async Task ExecuteAsync(CancellationToken parar)
    {
        var pasta = opcoes.Value.PastaDeExtratos;
        Directory.CreateDirectory(pasta);
        var fila = System.Threading.Channels.Channel.CreateUnbounded<string>();

        using var vigia = new FileSystemWatcher(pasta) { IncludeSubdirectories = false, EnableRaisingEvents = true };
        vigia.Created += (_, e) => fila.Writer.TryWrite(e.FullPath);
        vigia.Renamed += (_, e) => fila.Writer.TryWrite(e.FullPath);

        // Importar de novo um arquivo já importado não duplica nada, então os que já estão na pasta entram também.
        foreach (var existente in Directory.EnumerateFiles(pasta))
        {
            fila.Writer.TryWrite(existente);
        }

        log.LogInformation("Vigiando a pasta de extratos.");
        await foreach (var caminho in fila.Reader.ReadAllAsync(parar))
        {
            await ProcessarAsync(caminho, parar);
        }
    }

    private async Task ProcessarAsync(string caminho, CancellationToken parar)
    {
        if (FormatosDeExtrato.PeloNomeDoArquivo(caminho) is not { } formato)
        {
            return;
        }

        await using var arquivo = await AbrirQuandoLiberadoAsync(caminho, parar);
        if (arquivo is null)
        {
            log.LogWarning("Um extrato não pôde ser aberto: o arquivo continuou em uso.");
            return;
        }

        await using var escopo = escopos.CreateAsyncScope();
        var resultado = await escopo.ServiceProvider.GetRequiredService<ProcessarExtratoRecebido>()
            .ExecutarAsync(arquivo, formato, parar);

        switch (resultado.Importacao)
        {
            case ResultadoDaImportacao.Importado importado:
                log.LogInformation("Extrato importado: {Novas} transações novas, {Duplicadas} já existiam.", importado.Novas, importado.Duplicadas);
                var nivel = resultado.Fechamento is ResultadoDoFechamento.FalhaNoEnvio ? LogLevel.Warning : LogLevel.Information;
                log.Log(nivel, "{Fechamento}", TextoDoFechamento.De(resultado.Fechamento));
                break;
            case ResultadoDaImportacao.ArquivoInvalido invalido:
                log.LogWarning("Extrato inválido na linha {Linha}: {Motivo}", invalido.Linha, invalido.Motivo);
                break;
        }
    }

    // O arquivo pode ainda estar sendo copiado quando o aviso chega.
    private static async Task<FileStream?> AbrirQuandoLiberadoAsync(string caminho, CancellationToken parar)
    {
        for (var tentativa = 0; tentativa < TentativasDeAbrir; tentativa++)
        {
            try
            {
                return new FileStream(caminho, FileMode.Open, FileAccess.Read, FileShare.Read);
            }
            catch (IOException)
            {
                await Task.Delay(EsperaEntreTentativas, parar);
            }
        }

        return null;
    }
}

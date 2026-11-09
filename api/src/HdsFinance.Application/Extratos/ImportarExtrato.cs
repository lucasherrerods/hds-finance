using HdsFinance.Domain;

namespace HdsFinance.Application.Extratos;

public abstract record ResultadoDaImportacao
{
    public sealed record Importado(int Novas, int Duplicadas, decimal? SaldoFinal = null, DateOnly? CobertoAte = null) : ResultadoDaImportacao;

    public sealed record ArquivoInvalido(int Linha, string Motivo) : ResultadoDaImportacao;

    public sealed record FormatoNaoSuportado(FormatoDeExtrato Formato) : ResultadoDaImportacao;
}

public sealed class ImportarExtrato(
    IEnumerable<ILeitorDeExtrato> leitores,
    IRepositorioDeTransacoes repositorio,
    ClassificadorDeTipo? classificador = null)
{
    public async Task<ResultadoDaImportacao> ExecutarAsync(
        Stream conteudo, FormatoDeExtrato formato, CancellationToken cancelamento = default)
    {
        var leitor = leitores.FirstOrDefault(l => l.Formato == formato);
        if (leitor is null)
        {
            return new ResultadoDaImportacao.FormatoNaoSuportado(formato);
        }

        var leitura = await leitor.LerAsync(conteudo, cancelamento);
        if (leitura is ResultadoDaLeitura.Falha falha)
        {
            return new ResultadoDaImportacao.ArquivoInvalido(falha.Linha, falha.Motivo);
        }

        var classificar = (classificador ?? new ClassificadorDeTipo()).Classificar;
        var lidas = ((ResultadoDaLeitura.Sucesso)leitura).Transacoes.Select(classificar).ToList();
        var unicasDoArquivo = lidas.DistinctBy(t => t.ChaveDeDeduplicacao).ToList();
        var existentes = await repositorio.ChavesExistentesAsync(
            unicasDoArquivo.Select(t => t.ChaveDeDeduplicacao), cancelamento);
        var novas = unicasDoArquivo.Where(t => !existentes.Contains(t.ChaveDeDeduplicacao)).ToList();

        if (novas.Count > 0)
        {
            await repositorio.AdicionarAsync(novas, cancelamento);
        }

        var sucesso = (ResultadoDaLeitura.Sucesso)leitura;
        return new ResultadoDaImportacao.Importado(novas.Count, lidas.Count - novas.Count, sucesso.SaldoFinal, sucesso.CobertoAte);
    }
}

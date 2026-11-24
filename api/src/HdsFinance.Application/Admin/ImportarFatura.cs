using HdsFinance.Application.Extratos;
using HdsFinance.Domain;

namespace HdsFinance.Application.Admin;

public abstract record ResultadoDaLeituraDeFatura
{
    public sealed record Lida(Fatura Fatura) : ResultadoDaLeituraDeFatura;

    public sealed record SenhaNecessaria : ResultadoDaLeituraDeFatura;

    /// <summary>O motivo nunca traz trecho do arquivo.</summary>
    public sealed record Invalida(string Motivo) : ResultadoDaLeituraDeFatura;
}

/// <summary>Porta: lê a fatura em memória. A senha só abre o arquivo e não é guardada.</summary>
public interface ILeitorDeFatura
{
    ResultadoDaLeituraDeFatura Ler(byte[] conteudo, string nomeDoArquivo, string? senha);
}

public abstract record ResultadoDaFatura
{
    public sealed record Importada(int Novas, int Duplicadas) : ResultadoDaFatura;

    public sealed record SenhaNecessaria : ResultadoDaFatura;

    public sealed record Invalida(string Motivo) : ResultadoDaFatura;
}

/// <summary>Guarda as compras da fatura. Se os números não fecharem, nada é gravado.</summary>
public sealed class ImportarFatura(ILeitorDeFatura leitor, IRepositorioDeTransacoes repositorio)
{
    public const string NaoConfere = "Os valores lidos não fecham com o total da fatura, então nada foi gravado.";

    public async Task<ResultadoDaFatura> ExecutarAsync(byte[] conteudo, string nomeDoArquivo, string? senha, CancellationToken cancelamento = default)
    {
        switch (leitor.Ler(conteudo, nomeDoArquivo, senha))
        {
            case ResultadoDaLeituraDeFatura.Lida { Fatura: var fatura }:
                return fatura.Confere() ? await GuardarAsync(fatura, cancelamento) : new ResultadoDaFatura.Invalida(NaoConfere);
            case ResultadoDaLeituraDeFatura.Invalida invalida:
                return new ResultadoDaFatura.Invalida(invalida.Motivo);
            default:
                return new ResultadoDaFatura.SenhaNecessaria();
        }
    }

    private async Task<ResultadoDaFatura> GuardarAsync(Fatura fatura, CancellationToken cancelamento)
    {
        var transacoes = fatura.ParaTransacoes();
        var existentes = await repositorio.ChavesExistentesAsync(transacoes.Select(t => t.ChaveDeDeduplicacao), cancelamento);
        var novas = transacoes.Where(t => !existentes.Contains(t.ChaveDeDeduplicacao)).ToList();
        if (novas.Count > 0)
        {
            await repositorio.AdicionarAsync(novas, cancelamento);
        }

        // As marcas de pagamento não são compras, então ficam fora da contagem.
        var compras = transacoes.Count(t => t.Tipo == TipoDeTransacao.CompraNoCartao);
        var comprasNovas = novas.Count(t => t.Tipo == TipoDeTransacao.CompraNoCartao);
        return new ResultadoDaFatura.Importada(comprasNovas, compras - comprasNovas);
    }
}

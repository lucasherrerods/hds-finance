using HdsFinance.Domain;

namespace HdsFinance.Application.Extratos;

public enum FormatoDeExtrato
{
    Ofx,
    Csv,
}

public interface ILeitorDeExtrato
{
    FormatoDeExtrato Formato { get; }

    Task<ResultadoDaLeitura> LerAsync(Stream conteudo, CancellationToken cancelamento = default);
}

public abstract record ResultadoDaLeitura
{
    /// <summary>
    /// SaldoFinal é o saldo da conta depois de todas as transações do arquivo, quando ele informa.
    /// CobertoAte é o último dia do período exportado; sem ele, vale a data da última transação.
    /// </summary>
    public sealed record Sucesso(IReadOnlyList<Transacao> Transacoes, decimal? SaldoFinal = null, DateOnly? CobertoAte = null)
        : ResultadoDaLeitura
    {
        public DateOnly? CobertoAte { get; init; } = CobertoAte ?? (Transacoes.Count > 0 ? Transacoes.Max(t => t.Data) : null);
    }

    /// <summary>O motivo nunca traz trecho do arquivo, só a linha e o problema.</summary>
    public sealed record Falha(int Linha, string Motivo) : ResultadoDaLeitura;
}

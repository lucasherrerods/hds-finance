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
    /// <summary>SaldoFinal é o saldo da conta depois de todas as transações do arquivo, quando ele informa.</summary>
    public sealed record Sucesso(IReadOnlyList<Transacao> Transacoes, decimal? SaldoFinal = null) : ResultadoDaLeitura;

    /// <summary>O motivo nunca traz trecho do arquivo, só a linha e o problema.</summary>
    public sealed record Falha(int Linha, string Motivo) : ResultadoDaLeitura;
}

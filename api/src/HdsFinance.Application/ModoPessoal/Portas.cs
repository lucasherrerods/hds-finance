using HdsFinance.Domain;

namespace HdsFinance.Application.ModoPessoal;

/// <summary>Até que dia os extratos importados cobrem e qual era o saldo nesse dia.</summary>
public sealed record CoberturaDoHistorico(DateOnly? CobertoAte, decimal? SaldoFinal);

/// <summary>Porta: o que o modo pessoal anota além das transações.</summary>
public interface IRegistroDoModoPessoal
{
    Task RegistrarExtratoAsync(DateOnly? cobertoAte, decimal? saldoFinal, CancellationToken cancelamento = default);

    /// <summary>A cobertura do extrato que vai mais longe no tempo.</summary>
    Task<CoberturaDoHistorico> CoberturaAsync(CancellationToken cancelamento = default);

    Task<bool> JaEnviadoAsync(MesDeReferencia mes, CancellationToken cancelamento = default);

    Task MarcarEnviadoAsync(MesDeReferencia mes, DateTimeOffset quando, CancellationToken cancelamento = default);
}

public abstract record ResultadoDoEnvio
{
    public sealed record Enviado : ResultadoDoEnvio;

    /// <summary>O motivo nunca traz valores nem o endereço de e-mail.</summary>
    public sealed record Falha(string Motivo) : ResultadoDoEnvio;
}

/// <summary>Porta: entrega o PDF do fechamento ao dono da conta.</summary>
public interface INotificador
{
    Task<ResultadoDoEnvio> EnviarAsync(MesDeReferencia mes, byte[] pdf, CancellationToken cancelamento = default);
}

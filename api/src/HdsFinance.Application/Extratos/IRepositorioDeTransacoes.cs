using HdsFinance.Domain;

namespace HdsFinance.Application.Extratos;

public interface IRepositorioDeTransacoes
{
    Task<IReadOnlySet<string>> ChavesExistentesAsync(IEnumerable<string> chaves, CancellationToken cancelamento = default);

    Task AdicionarAsync(IReadOnlyCollection<Transacao> transacoes, CancellationToken cancelamento = default);

    Task<IReadOnlyList<Transacao>> ListarAsync(CancellationToken cancelamento = default);

    /// <summary>Apaga uma transação com esses dados. Se houver duas iguais, só uma sai.</summary>
    Task<bool> RemoverAsync(DateOnly data, decimal valor, string descricao, CancellationToken cancelamento = default);

    /// <summary>Apaga todas as transações do mês e devolve quantas saíram.</summary>
    Task<int> RemoverMesAsync(MesDeReferencia mes, CancellationToken cancelamento = default);
}

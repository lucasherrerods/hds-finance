using HdsFinance.Domain;

namespace HdsFinance.Application.Extratos;

public interface IRepositorioDeTransacoes
{
    Task<IReadOnlySet<string>> ChavesExistentesAsync(IEnumerable<string> chaves, CancellationToken cancelamento = default);

    Task AdicionarAsync(IReadOnlyCollection<Transacao> transacoes, CancellationToken cancelamento = default);
}

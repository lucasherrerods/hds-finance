using HdsFinance.Application.Extratos;
using HdsFinance.Domain;

namespace HdsFinance.Infrastructure.Repositorios;

/// <summary>Usado na demonstração e na CLI: vive só enquanto a requisição ou o comando roda.</summary>
public sealed class RepositorioEmMemoria : IRepositorioDeTransacoes
{
    private readonly List<Transacao> _transacoes = [];

    public Task<IReadOnlySet<string>> ChavesExistentesAsync(IEnumerable<string> chaves, CancellationToken cancelamento = default)
    {
        var existentes = _transacoes.Select(t => t.ChaveDeDeduplicacao).ToHashSet();
        return Task.FromResult<IReadOnlySet<string>>(chaves.Where(existentes.Contains).ToHashSet());
    }

    public Task AdicionarAsync(IReadOnlyCollection<Transacao> transacoes, CancellationToken cancelamento = default)
    {
        _transacoes.AddRange(transacoes);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Transacao>> ListarAsync(CancellationToken cancelamento = default) =>
        Task.FromResult<IReadOnlyList<Transacao>>(_transacoes.ToList());
}

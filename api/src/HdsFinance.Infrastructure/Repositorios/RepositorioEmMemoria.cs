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

    public Task<bool> RemoverAsync(DateOnly data, decimal valor, string descricao, CancellationToken cancelamento = default)
    {
        var indice = _transacoes.FindIndex(t => t.Data == data && t.Valor == valor && t.Descricao == descricao);
        if (indice >= 0)
        {
            _transacoes.RemoveAt(indice);
        }

        return Task.FromResult(indice >= 0);
    }

    public Task<bool> DefinirCategoriaAsync(string chave, string? categoria, CancellationToken cancelamento = default) =>
        Task.FromResult(Alterar(chave, t => t with { Categoria = categoria }));

    public Task<bool> DefinirOcultaAsync(string chave, bool oculta, CancellationToken cancelamento = default) =>
        Task.FromResult(Alterar(chave, t => t with { Oculta = oculta }));

    private bool Alterar(string chave, Func<Transacao, Transacao> alterar)
    {
        var indice = _transacoes.FindIndex(t => t.ChaveDeDeduplicacao == chave);
        if (indice >= 0)
        {
            _transacoes[indice] = alterar(_transacoes[indice]);
        }

        return indice >= 0;
    }

    public Task<int> RemoverMesAsync(MesDeReferencia mes, CancellationToken cancelamento = default) =>
        Task.FromResult(_transacoes.RemoveAll(t => mes.Contem(t.Data)));
}

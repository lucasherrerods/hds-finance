using HdsFinance.Application.Extratos;
using HdsFinance.Domain;
using Microsoft.EntityFrameworkCore;

namespace HdsFinance.Infrastructure.Repositorios;

/// <summary>Modo pessoal: guarda o histórico de transações no SQLite local.</summary>
public sealed class RepositorioSqlite(BancoDoModoPessoal banco) : IRepositorioDeTransacoes
{
    public async Task<IReadOnlySet<string>> ChavesExistentesAsync(IEnumerable<string> chaves, CancellationToken cancelamento = default)
    {
        var procuradas = chaves.ToList();
        var existentes = await banco.Transacoes
            .Where(t => procuradas.Contains(t.Chave))
            .Select(t => t.Chave)
            .ToListAsync(cancelamento);
        return existentes.ToHashSet();
    }

    public async Task AdicionarAsync(IReadOnlyCollection<Transacao> transacoes, CancellationToken cancelamento = default)
    {
        banco.Transacoes.AddRange(transacoes.Select(t => new TransacaoSalva
        {
            Chave = t.ChaveDeDeduplicacao,
            Data = t.Data,
            Valor = t.Valor,
            Descricao = t.Descricao,
            Tipo = t.Tipo,
            IdExterno = t.IdExterno,
        }));
        await banco.SaveChangesAsync(cancelamento);
    }

    public async Task<IReadOnlyList<Transacao>> ListarAsync(CancellationToken cancelamento = default)
    {
        var salvas = await banco.Transacoes.AsNoTracking().OrderBy(t => t.Id).ToListAsync(cancelamento);
        return salvas.Select(t => new Transacao(t.Data, t.Valor, t.Descricao, t.Tipo, t.IdExterno)).ToList();
    }
}

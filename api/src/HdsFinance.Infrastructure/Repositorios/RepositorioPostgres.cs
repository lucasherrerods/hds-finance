using HdsFinance.Application.Extratos;
using HdsFinance.Domain;
using Microsoft.EntityFrameworkCore;

namespace HdsFinance.Infrastructure.Repositorios;

/// <summary>Área admin: guarda o histórico de transações no Postgres.</summary>
public sealed class RepositorioPostgres(BancoDoAdmin banco) : IRepositorioDeTransacoes
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
            Categoria = t.Categoria,
            Oculta = t.Oculta,
        }));
        await banco.SaveChangesAsync(cancelamento);
    }

    public async Task<IReadOnlyList<Transacao>> ListarAsync(CancellationToken cancelamento = default)
    {
        var salvas = await banco.Transacoes.AsNoTracking().OrderBy(t => t.Id).ToListAsync(cancelamento);
        return salvas.Select(t => new Transacao(t.Data, t.Valor, t.Descricao, t.Tipo, t.IdExterno)
        {
            Categoria = t.Categoria,
            Oculta = t.Oculta,
        }).ToList();
    }

    public async Task<bool> RemoverAsync(DateOnly data, decimal valor, string descricao, CancellationToken cancelamento = default)
    {
        // O valor é comparado aqui, não no banco: guardado como texto, 10 e 10.00 seriam diferentes.
        var doDia = await banco.Transacoes.Where(t => t.Data == data && t.Descricao == descricao).OrderBy(t => t.Id).ToListAsync(cancelamento);
        if (doDia.FirstOrDefault(t => t.Valor == valor) is not { } alvo)
        {
            return false;
        }

        banco.Transacoes.Remove(alvo);
        await banco.SaveChangesAsync(cancelamento);
        return true;
    }

    public Task<bool> DefinirCategoriaAsync(string chave, string? categoria, CancellationToken cancelamento = default) =>
        AlterarAsync(chave, t => t.Categoria = categoria, cancelamento);

    public Task<bool> DefinirOcultaAsync(string chave, bool oculta, CancellationToken cancelamento = default) =>
        AlterarAsync(chave, t => t.Oculta = oculta, cancelamento);

    private async Task<bool> AlterarAsync(string chave, Action<TransacaoSalva> alterar, CancellationToken cancelamento)
    {
        if (await banco.Transacoes.FirstOrDefaultAsync(t => t.Chave == chave, cancelamento) is not { } salva)
        {
            return false;
        }

        alterar(salva);
        await banco.SaveChangesAsync(cancelamento);
        return true;
    }

    public Task<int> RemoverMesAsync(MesDeReferencia mes, CancellationToken cancelamento = default)
    {
        var inicio = new DateOnly(mes.Ano, mes.Mes, 1);
        return banco.Transacoes.Where(t => t.Data >= inicio && t.Data <= mes.UltimoDia).ExecuteDeleteAsync(cancelamento);
    }
}

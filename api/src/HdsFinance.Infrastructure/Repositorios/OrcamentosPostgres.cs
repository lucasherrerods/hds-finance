using HdsFinance.Application.Admin;
using Microsoft.EntityFrameworkCore;

namespace HdsFinance.Infrastructure.Repositorios;

public sealed class OrcamentosPostgres(BancoDoAdmin banco) : IRepositorioDeOrcamentos
{
    public async Task<IReadOnlyDictionary<string, decimal>> ListarAsync(CancellationToken cancelamento = default) =>
        await banco.Orcamentos.AsNoTracking().ToDictionaryAsync(o => o.Grupo, o => o.Limite, cancelamento);

    public async Task DefinirAsync(string grupo, decimal? limite, CancellationToken cancelamento = default)
    {
        var existente = await banco.Orcamentos.FindAsync([grupo], cancelamento);
        switch (existente, limite)
        {
            case (null, { } novo):
                banco.Orcamentos.Add(new OrcamentoSalvo { Grupo = grupo, Limite = novo });
                break;
            case ({ } salvo, { } novo):
                salvo.Limite = novo;
                break;
            case ({ } salvo, null):
                banco.Orcamentos.Remove(salvo);
                break;
            default:
                return;
        }

        await banco.SaveChangesAsync(cancelamento);
    }
}

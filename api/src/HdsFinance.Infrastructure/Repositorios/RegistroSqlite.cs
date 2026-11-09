using HdsFinance.Application.ModoPessoal;
using HdsFinance.Domain;
using Microsoft.EntityFrameworkCore;

namespace HdsFinance.Infrastructure.Repositorios;

public sealed class RegistroSqlite(BancoDoModoPessoal banco) : IRegistroDoModoPessoal
{
    public async Task RegistrarExtratoAsync(DateOnly? cobertoAte, decimal? saldoFinal, CancellationToken cancelamento = default)
    {
        banco.Extratos.Add(new ExtratoImportado { CobertoAte = cobertoAte, SaldoFinal = saldoFinal });
        await banco.SaveChangesAsync(cancelamento);
    }

    public async Task<CoberturaDoHistorico> CoberturaAsync(CancellationToken cancelamento = default)
    {
        var mais = await banco.Extratos.AsNoTracking()
            .Where(e => e.CobertoAte != null)
            .OrderByDescending(e => e.CobertoAte)
            .ThenByDescending(e => e.Id)
            .FirstOrDefaultAsync(cancelamento);
        return new CoberturaDoHistorico(mais?.CobertoAte, mais?.SaldoFinal);
    }

    public Task<bool> JaEnviadoAsync(MesDeReferencia mes, CancellationToken cancelamento = default) =>
        banco.MesesEnviados.AnyAsync(m => m.Ano == mes.Ano && m.Mes == mes.Mes, cancelamento);

    public async Task MarcarEnviadoAsync(MesDeReferencia mes, DateTimeOffset quando, CancellationToken cancelamento = default)
    {
        var existente = await banco.MesesEnviados.FindAsync([mes.Ano, mes.Mes], cancelamento);
        if (existente is null)
        {
            banco.MesesEnviados.Add(new MesEnviado { Ano = mes.Ano, Mes = mes.Mes, EnviadoEm = quando });
        }
        else
        {
            existente.EnviadoEm = quando;
        }

        await banco.SaveChangesAsync(cancelamento);
    }
}

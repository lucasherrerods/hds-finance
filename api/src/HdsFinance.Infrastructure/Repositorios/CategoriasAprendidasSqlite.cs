using HdsFinance.Application.Categorias;
using HdsFinance.Domain;
using Microsoft.EntityFrameworkCore;

namespace HdsFinance.Infrastructure.Repositorios;

public sealed class CategoriasAprendidasSqlite(BancoDoModoPessoal banco) : ICategoriasAprendidas
{
    public async Task<IReadOnlyList<CategoriaAprendida>> ListarAsync(CancellationToken cancelamento = default) =>
        await banco.CategoriasAprendidas.AsNoTracking()
            .Select(c => new CategoriaAprendida(c.Descricao, c.Categoria))
            .ToListAsync(cancelamento);

    public async Task SalvarAsync(CategoriaAprendida aprendida, CancellationToken cancelamento = default)
    {
        var chave = Categorizador.ChaveDaDescricao(aprendida.Descricao);
        var existente = await banco.CategoriasAprendidas.FindAsync([chave], cancelamento);
        if (existente is null)
        {
            banco.CategoriasAprendidas.Add(new CategoriaAprendidaSalva { Chave = chave, Descricao = aprendida.Descricao, Categoria = aprendida.Categoria });
        }
        else
        {
            existente.Descricao = aprendida.Descricao;
            existente.Categoria = aprendida.Categoria;
        }

        await banco.SaveChangesAsync(cancelamento);
    }
}

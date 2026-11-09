using HdsFinance.Domain;

namespace HdsFinance.Application.Categorias;

/// <summary>Porta: as correções de categoria feitas pela pessoa, guardadas no modo pessoal.</summary>
public interface ICategoriasAprendidas
{
    Task<IReadOnlyList<CategoriaAprendida>> ListarAsync(CancellationToken cancelamento = default);

    /// <summary>Uma correção nova para a mesma descrição substitui a anterior.</summary>
    Task SalvarAsync(CategoriaAprendida aprendida, CancellationToken cancelamento = default);
}

public abstract record ResultadoDaCorrecao
{
    public sealed record Corrigida : ResultadoDaCorrecao;

    public sealed record CategoriaInvalida : ResultadoDaCorrecao;

    public sealed record DescricaoVazia : ResultadoDaCorrecao;
}

/// <summary>Guarda a categoria escolhida para uma descrição. Da próxima vez, ela vence as regras por palavra.</summary>
public sealed class CorrigirCategoria(ICategoriasAprendidas aprendidas, Categorizador categorizador)
{
    public async Task<ResultadoDaCorrecao> ExecutarAsync(string descricao, string categoria, CancellationToken cancelamento = default)
    {
        if (string.IsNullOrWhiteSpace(descricao))
        {
            return new ResultadoDaCorrecao.DescricaoVazia();
        }

        if (!categorizador.Categorias.Contains(categoria))
        {
            return new ResultadoDaCorrecao.CategoriaInvalida();
        }

        await aprendidas.SalvarAsync(new CategoriaAprendida(descricao, categoria), cancelamento);
        return new ResultadoDaCorrecao.Corrigida();
    }
}

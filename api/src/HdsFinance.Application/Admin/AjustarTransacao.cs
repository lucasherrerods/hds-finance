using HdsFinance.Application.Extratos;
using HdsFinance.Domain;

namespace HdsFinance.Application.Admin;

public abstract record ResultadoDoAjuste
{
    public sealed record Ajustada : ResultadoDoAjuste;

    public sealed record CategoriaInvalida : ResultadoDoAjuste;

    public sealed record NaoEncontrada : ResultadoDoAjuste;
}

/// <summary>Ajustes do admin numa transação só: a categoria dela e se ela entra nas somas.</summary>
public sealed class AjustarTransacao(IRepositorioDeTransacoes repositorio, Categorizador categorizador)
{
    public async Task<ResultadoDoAjuste> CategoriaAsync(string chave, string? categoria, CancellationToken cancelamento = default)
    {
        var escolhida = categoria == TransacaoCategorizada.CategoriaDeEntrada ? null : categoria;
        if (escolhida is not null && !categorizador.Categorias.Contains(escolhida))
        {
            return new ResultadoDoAjuste.CategoriaInvalida();
        }

        return Resultado(await repositorio.DefinirCategoriaAsync(chave, escolhida, cancelamento));
    }

    public async Task<ResultadoDoAjuste> OcultarAsync(string chave, bool oculta, CancellationToken cancelamento = default) =>
        Resultado(await repositorio.DefinirOcultaAsync(chave, oculta, cancelamento));

    private static ResultadoDoAjuste Resultado(bool encontrada) =>
        encontrada ? new ResultadoDoAjuste.Ajustada() : new ResultadoDoAjuste.NaoEncontrada();
}

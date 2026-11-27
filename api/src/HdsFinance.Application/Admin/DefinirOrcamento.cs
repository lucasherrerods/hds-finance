using HdsFinance.Domain;

namespace HdsFinance.Application.Admin;

public enum ResultadoDoOrcamento
{
    Definido,
    Invalido,
}

/// <summary>Define ou tira o limite mensal de um grupo. Zero ou nada tira o limite.</summary>
public sealed class DefinirOrcamento(IRepositorioDeOrcamentos orcamentos)
{
    public async Task<ResultadoDoOrcamento> ExecutarAsync(string grupo, decimal? limite, CancellationToken cancelamento = default)
    {
        if (!GruposDeCategoria.Todos.Any(g => g.Nome == grupo) || limite < 0)
        {
            return ResultadoDoOrcamento.Invalido;
        }

        await orcamentos.DefinirAsync(grupo, limite is > 0 ? limite : null, cancelamento);
        return ResultadoDoOrcamento.Definido;
    }
}

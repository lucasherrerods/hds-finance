namespace HdsFinance.Domain;

public sealed record GrupoNoPanorama(string Grupo, decimal Atual, decimal Media);

/// <summary>
/// O que a IA pode ver de um mês: só totais e nomes de grupo, nunca descrição de transação.
/// A média é dos até três meses anteriores que existem no histórico.
/// </summary>
public sealed record PanoramaDoMes(MesDeReferencia Mes, decimal Entradas, decimal Saidas, decimal MediaDasSaidas, int MesesNaMedia, IReadOnlyList<GrupoNoPanorama> Grupos)
{
    public static PanoramaDoMes? Montar(IReadOnlyList<ResumoMensal> meses, MesDeReferencia mes)
    {
        var atual = meses.FirstOrDefault(m => m.Mes == mes);
        if (atual is null)
        {
            return null;
        }

        var anteriores = meses.TakeWhile(m => m.Mes != mes).TakeLast(AlertasDoMes.MesesDaMedia).ToList();
        decimal Media(Func<ResumoMensal, decimal> valor) => anteriores.Count == 0 ? 0m : decimal.Round(anteriores.Sum(valor) / anteriores.Count, 2);

        var grupos = atual.GastosPorCategoria.Select(g => GruposDeCategoria.GrupoDe(g.Categoria))
            .Concat(anteriores.SelectMany(m => m.GastosPorCategoria.Select(g => GruposDeCategoria.GrupoDe(g.Categoria))))
            .Distinct()
            .Select(grupo => new GrupoNoPanorama(grupo, PorGrupo(atual, grupo), Media(m => PorGrupo(m, grupo))))
            .OrderByDescending(g => g.Atual)
            .ToList();

        return new PanoramaDoMes(mes, atual.Entradas, atual.Saidas, Media(m => m.Saidas), anteriores.Count, grupos);
    }

    private static decimal PorGrupo(ResumoMensal mes, string grupo) =>
        mes.GastosPorCategoria.Where(g => GruposDeCategoria.GrupoDe(g.Categoria) == grupo).Sum(g => g.Valor);
}

/// <summary>Quanto foi gasto numa categoria ou grupo entre dois meses, inclusive. Nome comparado sem acento nem maiúsculas.</summary>
public static class ConsultaDeGastos
{
    public static decimal NoPeriodo(IEnumerable<ResumoMensal> meses, string nome, MesDeReferencia de, MesDeReferencia ate)
    {
        var alvo = TextoNormalizado.De(nome);
        return meses
            .Where(m => !m.Mes.AntesDe(de) && !ate.AntesDe(m.Mes))
            .SelectMany(m => m.GastosPorCategoria)
            .Where(g => TextoNormalizado.De(g.Categoria) == alvo || TextoNormalizado.De(GruposDeCategoria.GrupoDe(g.Categoria)) == alvo)
            .Sum(g => g.Valor);
    }

    /// <summary>O nome como está na lista de categorias ou de grupos, ou nulo se não existe.</summary>
    public static string? NomeConhecido(string nome)
    {
        var alvo = TextoNormalizado.De(nome);
        return GruposDeCategoria.Todos.SelectMany(g => g.Categorias.Prepend(g.Nome)).FirstOrDefault(n => TextoNormalizado.De(n) == alvo);
    }
}

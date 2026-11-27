namespace HdsFinance.Domain;

public enum SituacaoDoOrcamento
{
    Tranquilo,

    /// <summary>A partir de 80% do limite.</summary>
    Atencao,
    Estourou,
}

public sealed record OrcamentoDoGrupo(string Grupo, decimal Limite, decimal Gasto, decimal Percentual, SituacaoDoOrcamento Situacao);

/// <summary>Limite de gasto por mês para cada grupo de categorias, comparado com o que já saiu no mês.</summary>
public static class Orcamento
{
    private const decimal Atencao = 80m;

    /// <summary>Na ordem dos grupos; grupo sem limite fica de fora.</summary>
    public static IReadOnlyList<OrcamentoDoGrupo> Acompanhar(
        IReadOnlyDictionary<string, decimal> limites, IEnumerable<Transacao> transacoes, Categorizador categorizador, MesDeReferencia mes)
    {
        var gastoPorGrupo = transacoes
            .Where(t => t.EhGasto && mes.Contem(t.Data))
            .GroupBy(t => GruposDeCategoria.GrupoDe(categorizador.Categorizar(t)))
            .ToDictionary(g => g.Key, g => -g.Sum(t => t.Valor));

        return GruposDeCategoria.Todos
            .Where(g => limites.TryGetValue(g.Nome, out var limite) && limite > 0)
            .Select(g =>
            {
                var limite = limites[g.Nome];
                var gasto = Math.Max(0m, gastoPorGrupo.GetValueOrDefault(g.Nome));
                var percentual = Math.Round(gasto / limite * 100, 1);
                var situacao = percentual >= 100 ? SituacaoDoOrcamento.Estourou : percentual >= Atencao ? SituacaoDoOrcamento.Atencao : SituacaoDoOrcamento.Tranquilo;
                return new OrcamentoDoGrupo(g.Nome, limite, gasto, percentual, situacao);
            })
            .ToList();
    }
}

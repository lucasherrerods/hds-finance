namespace HdsFinance.Domain;

public enum SituacaoDaRecorrente
{
    /// <summary>Ainda não apareceu no mês.</summary>
    Pendente,
    Paga,

    /// <summary>Apareceu no mês com valor acima do de costume.</summary>
    MaisCara,
}

/// <summary>Valor e dia são os da última vez antes do mês; ValorNoMes é o que já saiu no mês, se saiu.</summary>
public sealed record Recorrente(string Descricao, string Categoria, decimal Valor, int Dia, SituacaoDaRecorrente Situacao, decimal? ValorNoMes);

/// <summary>
/// Gastos que se repetem todo mês com valor parecido: assinaturas, aluguel, faculdade.
/// Fica de fora o que aparece várias vezes no mês (pedágio, café), parcela (tem tela própria) e o que parou de vir.
/// </summary>
public static class Recorrentes
{
    private const int MesesOlhados = 6;
    private const int MinimoDeMeses = 3;
    private const decimal VariacaoMaxima = 1.5m;
    private const decimal FolgaDoAumento = 1.05m;

    public static IReadOnlyList<Recorrente> Detectar(IEnumerable<Transacao> transacoes, Categorizador categorizador, MesDeReferencia mes)
    {
        var inicioDoMes = new DateOnly(mes.Ano, mes.Mes, 1);
        var inicio = inicioDoMes.AddMonths(-(MesesOlhados - 1));
        var gastos = transacoes
            .Where(t => t.EhGasto && t.Valor < 0 && t.Data >= inicio && t.Data <= mes.UltimoDia)
            .Where(t => !TextoNormalizado.ContemAlgum(t.Descricao, [TextoNormalizado.ParaComparar("parcela")]))
            .GroupBy(t => TextoNormalizado.ParaComparar(t.Descricao));

        var recorrentes = new List<Recorrente>();
        foreach (var grupo in gastos)
        {
            var porMes = grupo.GroupBy(t => new DateOnly(t.Data.Year, t.Data.Month, 1)).OrderBy(g => g.Key).ToList();
            var antes = porMes.Where(m => m.Key < inicioDoMes).ToList();
            if (porMes.Count < MinimoDeMeses || antes.Count == 0 || porMes.Any(m => m.Count() > 1))
            {
                continue;
            }

            var valores = porMes.Select(m => -m.Sum(t => t.Valor)).ToList();
            var ultimaVez = antes[^1].Single();
            var parou = porMes[^1].Key < inicioDoMes.AddMonths(-2);
            if (parou || valores.Max() > valores.Min() * VariacaoMaxima)
            {
                continue;
            }

            var valor = -ultimaVez.Valor;
            var noMes = porMes[^1].Key == inicioDoMes ? -porMes[^1].Single().Valor : (decimal?)null;
            var situacao = noMes switch
            {
                null => SituacaoDaRecorrente.Pendente,
                var v when v > valor * FolgaDoAumento => SituacaoDaRecorrente.MaisCara,
                _ => SituacaoDaRecorrente.Paga,
            };
            var maisRecente = grupo.MaxBy(t => t.Data)!;
            recorrentes.Add(new Recorrente(maisRecente.Descricao, categorizador.Categorizar(maisRecente), valor, ultimaVez.Data.Day, situacao, noMes));
        }

        return recorrentes.OrderBy(r => r.Dia).ThenBy(r => r.Descricao, StringComparer.Ordinal).ToList();
    }
}

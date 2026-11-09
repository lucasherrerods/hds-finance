namespace HdsFinance.Domain;

/// <summary>Gasto acumulado até o dia, neste mês e no anterior. Nulo onde ainda não há dado.</summary>
public sealed record PontoDoRitmo(int Dia, decimal? AcumuladoAtual, decimal? AcumuladoAnterior);

/// <summary>Semana é a coluna do calendário do mês, começando em zero na semana do dia 1º.</summary>
public sealed record GastoDoDia(int Dia, DayOfWeek DiaDaSemana, int Semana, decimal Valor);

public sealed record CategoriaComparada(string Categoria, decimal Atual, decimal? Anterior, decimal? VariacaoPercentual);

/// <summary>
/// Visão do último mês do extrato, comparada com o mês anterior quando ele também está no extrato.
/// Gasto aqui é só despesa: investimentos e transferências entre contas próprias ficam de fora.
/// </summary>
public sealed record PainelDoMes(
    MesDeReferencia Mes,
    decimal GastoNoMes,
    decimal? GastoNoMesAnterior,
    decimal? VariacaoPercentual,
    decimal MediaDiaria,
    GastoDoDia? MaiorGasto,
    IReadOnlyList<PontoDoRitmo> Ritmo,
    IReadOnlyList<GastoDoDia> MapaDeCalor,
    IReadOnlyList<CategoriaComparada> PrincipaisCategorias,
    IReadOnlyList<TransacaoCategorizada> TransacoesRecentes)
{
    private const int LimiteDeCategorias = 5;
    private const int LimiteDeTransacoes = 10;

    public static PainelDoMes? Montar(IEnumerable<Transacao> transacoes, Categorizador categorizador)
    {
        var todas = transacoes.ToList();
        if (todas.Count == 0)
        {
            return null;
        }

        var ultima = todas.Max(t => t.Data);
        var mes = new MesDeReferencia(ultima.Year, ultima.Month);
        var primeiroDia = new DateOnly(mes.Ano, mes.Mes, 1);
        var anterior = new MesDeReferencia(primeiroDia.AddMonths(-1).Year, primeiroDia.AddMonths(-1).Month);

        var doMes = todas.Where(t => mes.Contem(t.Data)).ToList();
        var doAnterior = todas.Where(t => anterior.Contem(t.Data)).ToList();
        var temAnterior = doAnterior.Count > 0;

        var gastos = Gastos(doMes);
        var gastosAnteriores = Gastos(doAnterior);
        var gastoNoMes = gastos.Sum(t => -t.Valor);
        decimal? gastoAnterior = temAnterior ? gastosAnteriores.Sum(t => -t.Valor) : null;

        var diasNoMes = DateTime.DaysInMonth(mes.Ano, mes.Mes);
        var ultimoDiaComMovimento = doMes.Max(t => t.Data.Day);

        var mapa = Enumerable.Range(1, diasNoMes)
            .Select(dia => new GastoDoDia(
                dia,
                new DateOnly(mes.Ano, mes.Mes, dia).DayOfWeek,
                (dia - 1 + (int)primeiroDia.DayOfWeek) / 7,
                gastos.Where(t => t.Data.Day == dia).Sum(t => -t.Valor)))
            .ToList();

        return new PainelDoMes(
            mes,
            gastoNoMes,
            gastoAnterior,
            Variacao(gastoNoMes, gastoAnterior),
            Math.Round(gastoNoMes / ultimoDiaComMovimento, 2),
            gastoNoMes > 0 ? mapa.MaxBy(d => d.Valor) : null,
            CalcularRitmo(gastos, gastosAnteriores, temAnterior, diasNoMes, ultimoDiaComMovimento),
            mapa,
            CompararCategorias(gastos, gastosAnteriores, temAnterior, categorizador),
            TransacaoCategorizada.Listar(doMes, categorizador).Take(LimiteDeTransacoes).ToList());
    }

    private static List<Transacao> Gastos(IEnumerable<Transacao> transacoes) =>
        transacoes.Where(t => t.ContaNoFluxoDeCaixa && t.Valor < 0).ToList();

    private static decimal? Variacao(decimal atual, decimal? anterior) =>
        anterior is > 0 ? Math.Round((atual - anterior.Value) / anterior.Value * 100, 1) : null;

    private static List<PontoDoRitmo> CalcularRitmo(
        List<Transacao> gastos, List<Transacao> gastosAnteriores, bool temAnterior, int diasNoMes, int ultimoDia)
    {
        decimal? AcumuladoAte(List<Transacao> lista, int dia) => lista.Where(t => t.Data.Day <= dia).Sum(t => -t.Valor);

        return Enumerable.Range(1, diasNoMes)
            .Select(dia => new PontoDoRitmo(
                dia,
                dia <= ultimoDia ? AcumuladoAte(gastos, dia) : null,
                temAnterior ? AcumuladoAte(gastosAnteriores, dia) : null))
            .ToList();
    }

    private static List<CategoriaComparada> CompararCategorias(
        List<Transacao> gastos, List<Transacao> gastosAnteriores, bool temAnterior, Categorizador categorizador)
    {
        var anteriores = gastosAnteriores
            .GroupBy(categorizador.Categorizar)
            .ToDictionary(g => g.Key, g => g.Sum(t => -t.Valor));

        return gastos
            .GroupBy(categorizador.Categorizar)
            .Select(g =>
            {
                var atual = g.Sum(t => -t.Valor);
                decimal? anterior = temAnterior ? anteriores.GetValueOrDefault(g.Key) : null;
                return new CategoriaComparada(g.Key, atual, anterior, Variacao(atual, anterior));
            })
            .OrderByDescending(c => c.Atual)
            .Take(LimiteDeCategorias)
            .ToList();
    }
}

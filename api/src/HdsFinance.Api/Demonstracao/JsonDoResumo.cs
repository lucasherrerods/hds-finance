using HdsFinance.Application.Extratos;
using HdsFinance.Domain;

namespace HdsFinance.Api.Demonstracao;

public sealed record ResumoDoExtratoJson(
    int TransacoesNovas,
    int Duplicadas,
    IReadOnlyList<MesJson> Meses,
    PainelJson? Painel,
    IReadOnlyList<TransacaoJson> Transacoes);

public sealed record MesJson(
    int Ano,
    int Mes,
    decimal Entradas,
    decimal Saidas,
    decimal Resultado,
    decimal InvestimentosETransferencias,
    decimal? SaldoInicial,
    decimal? SaldoFinal,
    IReadOnlyList<GastoJson> GastosPorCategoria);

public sealed record GastoJson(string Categoria, decimal Valor);

public sealed record PainelJson(
    int Ano,
    int Mes,
    decimal GastoNoMes,
    decimal? GastoNoMesAnterior,
    decimal? VariacaoPercentual,
    decimal MediaDiaria,
    GastoDoDiaJson? MaiorGasto,
    IReadOnlyList<PontoDoRitmoJson> Ritmo,
    IReadOnlyList<GastoDoDiaJson> MapaDeCalor,
    IReadOnlyList<CategoriaComparadaJson> PrincipaisCategorias,
    IReadOnlyList<TransacaoJson> TransacoesRecentes);

public sealed record PontoDoRitmoJson(int Dia, decimal? AcumuladoAtual, decimal? AcumuladoAnterior);

/// <summary>DiaDaSemana vai de 0 (domingo) a 6 (sábado).</summary>
public sealed record GastoDoDiaJson(int Dia, int DiaDaSemana, int Semana, decimal Valor);

public sealed record CategoriaComparadaJson(string Categoria, decimal Atual, decimal? Anterior, decimal? VariacaoPercentual);

public sealed record TransacaoJson(DateOnly Data, string Descricao, string Categoria, decimal Valor);

public static class JsonDoResumo
{
    public static ResumoDoExtratoJson De(ResultadoDoResumo.Resumido resumido) => new(
        resumido.Importacao.Novas,
        resumido.Importacao.Duplicadas,
        resumido.Meses.Select(De).ToList(),
        resumido.Painel is null ? null : De(resumido.Painel),
        resumido.Transacoes.Select(De).ToList());

    private static MesJson De(ResumoMensal m) => new(
        m.Mes.Ano, m.Mes.Mes, m.Entradas, m.Saidas, m.Resultado,
        m.InvestimentosETransferencias, m.SaldoInicial, m.SaldoFinal,
        m.GastosPorCategoria.Select(g => new GastoJson(g.Categoria, g.Valor)).ToList());

    private static PainelJson De(PainelDoMes p) => new(
        p.Mes.Ano,
        p.Mes.Mes,
        p.GastoNoMes,
        p.GastoNoMesAnterior,
        p.VariacaoPercentual,
        p.MediaDiaria,
        p.MaiorGasto is null ? null : De(p.MaiorGasto),
        p.Ritmo.Select(r => new PontoDoRitmoJson(r.Dia, r.AcumuladoAtual, r.AcumuladoAnterior)).ToList(),
        p.MapaDeCalor.Select(De).ToList(),
        p.PrincipaisCategorias.Select(c => new CategoriaComparadaJson(c.Categoria, c.Atual, c.Anterior, c.VariacaoPercentual)).ToList(),
        p.TransacoesRecentes.Select(De).ToList());

    private static TransacaoJson De(TransacaoCategorizada t) => new(t.Data, t.Descricao, t.Categoria, t.Valor);

    private static GastoDoDiaJson De(GastoDoDia d) => new(d.Dia, (int)d.DiaDaSemana, d.Semana, d.Valor);
}

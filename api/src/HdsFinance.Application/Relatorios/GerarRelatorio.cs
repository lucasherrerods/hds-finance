using HdsFinance.Domain;

namespace HdsFinance.Application.Relatorios;

public abstract record ResultadoDoRelatorio
{
    public sealed record Gerado(byte[] Pdf, MesDeReferencia Mes) : ResultadoDoRelatorio
    {
        public bool Equals(Gerado? outro) => outro is not null && Mes == outro.Mes && Pdf.AsSpan().SequenceEqual(outro.Pdf);

        public override int GetHashCode() => Mes.GetHashCode();
    }

    public sealed record MesSemDados(MesDeReferencia? Mes) : ResultadoDoRelatorio;
}

/// <summary>Gera o relatório de um mês (o mais recente, se nenhum for pedido) com até 12 meses de histórico.</summary>
public sealed class GerarRelatorio(IGeradorDeRelatorio gerador, TimeProvider tempo)
{
    public const int MesesDeHistorico = 12;

    public ResultadoDoRelatorio Executar(IReadOnlyList<ResumoMensal> meses, MesDeReferencia? mes = null)
    {
        var ordenados = meses.OrderBy(m => m.Mes.Ano).ThenBy(m => m.Mes.Mes).ToList();
        var escolhido = mes is { } pedido ? ordenados.FirstOrDefault(m => m.Mes == pedido) : ordenados.LastOrDefault();
        if (escolhido is null)
        {
            return new ResultadoDoRelatorio.MesSemDados(mes);
        }

        var ate = ordenados.IndexOf(escolhido);
        var historico = ordenados.Take(ate + 1).TakeLast(MesesDeHistorico).ToList();
        var hoje = DateOnly.FromDateTime(tempo.GetLocalNow().DateTime);

        return new ResultadoDoRelatorio.Gerado(gerador.Gerar(new Relatorio(escolhido, historico, hoje)), escolhido.Mes);
    }
}

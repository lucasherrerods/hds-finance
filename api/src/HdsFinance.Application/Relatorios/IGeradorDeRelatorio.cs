using HdsFinance.Domain;

namespace HdsFinance.Application.Relatorios;

/// <summary>O fechamento de um mês com o histórico que leva até ele, do mais antigo ao mais recente.</summary>
public sealed record Relatorio(ResumoMensal Mes, IReadOnlyList<ResumoMensal> Historico, DateOnly GeradoEm)
{
    /// <summary>O mês do calendário logo antes, para comparar. Nulo quando não está no histórico.</summary>
    public ResumoMensal? Anterior
    {
        get
        {
            var antes = new DateOnly(Mes.Mes.Ano, Mes.Mes.Mes, 1).AddMonths(-1);
            return Historico.FirstOrDefault(m => m.Mes == new MesDeReferencia(antes.Year, antes.Month));
        }
    }

    /// <summary>0,5 é 50% a mais. Nulo quando não há com o que comparar.</summary>
    public static decimal? Variacao(decimal atual, decimal? anterior) =>
        anterior is { } a && a != 0m ? (atual - a) / Math.Abs(a) : null;
}

/// <summary>Porta: transforma o relatório num documento, inteiro em memória.</summary>
public interface IGeradorDeRelatorio
{
    byte[] Gerar(Relatorio relatorio);
}

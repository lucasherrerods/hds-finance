using HdsFinance.Domain;

namespace HdsFinance.Application.Relatorios;

/// <summary>O fechamento de um mês com o histórico que leva até ele, do mais antigo ao mais recente.</summary>
public sealed record Relatorio(ResumoMensal Mes, IReadOnlyList<ResumoMensal> Historico, DateOnly GeradoEm);

/// <summary>Porta: transforma o relatório num documento, inteiro em memória.</summary>
public interface IGeradorDeRelatorio
{
    byte[] Gerar(Relatorio relatorio);
}

using System.Globalization;
using HdsFinance.Domain;

namespace HdsFinance.Infrastructure.Relatorios;

/// <summary>Valores e datas como o leitor brasileiro espera: R$ 1.234,56 e dd/MM/yyyy.</summary>
public static class FormatoBrasileiro
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    // O .NET separa o símbolo do valor com espaço inquebrável; no PDF e nos testes vale o espaço comum.
    public static string Moeda(decimal valor) => valor.ToString("C", PtBr).Replace(' ', ' ');

    public static string Moeda(decimal? valor) => valor is { } v ? Moeda(v) : "não informado";

    public static string Percentual(decimal valor) => valor.ToString("P0", PtBr);

    /// <summary>O sinal vem escrito para a variação não depender só da cor.</summary>
    public static string PercentualComSinal(decimal valor) =>
        Math.Round(valor, 2) == 0m ? "0%" : $"{(valor > 0m ? "+" : "−")}{Percentual(Math.Abs(valor))}";

    public static string Data(DateOnly data) => data.ToString("dd/MM/yyyy", PtBr);

    public static string Mes(MesDeReferencia mes) => new DateOnly(mes.Ano, mes.Mes, 1).ToString("MMMM 'de' yyyy", PtBr);

    public static string MesCurto(MesDeReferencia mes) => new DateOnly(mes.Ano, mes.Mes, 1).ToString("MMM/yy", PtBr).Replace(".", "");
}

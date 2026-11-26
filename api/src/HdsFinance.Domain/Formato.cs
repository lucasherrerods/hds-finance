using System.Globalization;

namespace HdsFinance.Domain;

/// <summary>Números e meses escritos como no Brasil, para textos de alerta e mensagens.</summary>
public static class Formato
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    public static string Moeda(decimal valor) => valor.ToString("C", PtBr);

    public static string Mes(MesDeReferencia mes) => new DateOnly(mes.Ano, mes.Mes, 1).ToString("MMMM 'de' yyyy", PtBr);
}

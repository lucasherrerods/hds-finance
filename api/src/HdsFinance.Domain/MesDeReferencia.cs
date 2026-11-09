using System.Globalization;

namespace HdsFinance.Domain;

public readonly record struct MesDeReferencia(int Ano, int Mes)
{
    public DateOnly UltimoDia => new(Ano, Mes, DateTime.DaysInMonth(Ano, Mes));

    public bool Contem(DateOnly data) => data.Year == Ano && data.Month == Mes;

    /// <summary>O mês está completo quando algum extrato importado cobre até o último dia dele.</summary>
    public bool EstaCompleto(DateOnly? cobertoAte) => cobertoAte >= UltimoDia;

    public static MesDeReferencia De(DateOnly data) => new(data.Year, data.Month);

    /// <summary>O mês mais recente que a cobertura dos extratos já fechou.</summary>
    public static MesDeReferencia? UltimoCompleto(DateOnly? cobertoAte)
    {
        if (cobertoAte is not { } ate)
        {
            return null;
        }

        var doDia = De(ate);
        return doDia.EstaCompleto(ate) ? doDia : De(ate.AddMonths(-1));
    }

    public static MesDeReferencia? TentarLer(string texto) =>
        DateOnly.TryParseExact(texto, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var data)
            ? De(data)
            : null;

    public override string ToString() => $"{Ano:0000}-{Mes:00}";
}

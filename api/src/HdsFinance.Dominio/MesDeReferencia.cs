namespace HdsFinance.Dominio;

public readonly record struct MesDeReferencia(int Ano, int Mes)
{
    public bool Contem(DateOnly data) => data.Year == Ano && data.Month == Mes;
}

namespace HdsFinance.Infrastructure.Relatorios;

/// <summary>
/// Único lugar das cores do PDF. São as mesmas do tema claro do web (web/src/shared/styles/tokens.css),
/// porque o papel é claro.
/// </summary>
public static class CoresDoRelatorio
{
    public const string Fundo = "#f7f8fa";
    public const string Superficie = "#fcfdfe";
    public const string Borda = "#dfe3ea";
    public const string Texto = "#161a22";
    public const string TextoSuave = "#5a6375";
    public const string Primaria = "#2f5bd3";
    public const string Entrada = "#1f7a4d";
    public const string Saida = "#b4362f";

    public static readonly string[] Grafico = ["#2f5bd3", "#e0a42b", "#1f8f7a", "#8a5ad6", "#d0613c"];
}

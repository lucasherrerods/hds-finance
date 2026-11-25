namespace HdsFinance.Infrastructure.Relatorios;

/// <summary>
/// Único lugar das cores do PDF e dos e-mails. São as mesmas do tema claro do web (web/src/shared/styles/tokens.css),
/// porque o papel e o corpo do e-mail são claros.
/// </summary>
public static class CoresDoRelatorio
{
    public const string Fundo = "#f5f8f7";
    public const string Superficie = "#fbfdfc";
    public const string Borda = "#dbe3e0";
    public const string Texto = "#191a1a";
    public const string TextoSuave = "#5c605f";
    public const string Primaria = "#0f8a5f";
    public const string PrimariaSuave = "#dcf1e8";
    public const string Entrada = "#0f7a52";
    public const string Saida = "#c0392f";

    public static readonly string[] Grafico = ["#0f8a5f", "#e0a42b", "#14706a", "#7a4fc0", "#a84a2c"];
}

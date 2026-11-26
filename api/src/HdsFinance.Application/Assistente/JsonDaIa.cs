using System.Text.Json;

namespace HdsFinance.Application.Assistente;

internal static class JsonDaIa
{
    /// <summary>O campo como texto, ou vazio quando falta ou não é texto: a resposta da IA nunca é confiável.</summary>
    public static string Texto(this JsonElement objeto, string nome) =>
        objeto.TryGetProperty(nome, out var valor) && valor.ValueKind == JsonValueKind.String ? valor.GetString()!.Trim() : string.Empty;
}

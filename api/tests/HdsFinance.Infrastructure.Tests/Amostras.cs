namespace HdsFinance.Infrastructure.Tests;

internal static class Amostras
{
    public static Stream Abrir(string nome) =>
        File.OpenRead(Path.Combine(AppContext.BaseDirectory, "samples", nome));

    public static Stream DeTexto(string texto) =>
        new MemoryStream(System.Text.Encoding.UTF8.GetBytes(texto));
}

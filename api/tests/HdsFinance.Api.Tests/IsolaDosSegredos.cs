using System.Runtime.CompilerServices;

namespace HdsFinance.Api.Tests;

/// <summary>
/// Os testes rodam em Development, que lê os user-secrets de quem desenvolve.
/// Variável de ambiente vence os segredos, então nenhum teste alcança o banco nem o e-mail de verdade.
/// </summary>
internal static class IsolaDosSegredos
{
    // Um espaço, porque no Windows uma variável vazia deixa de existir.
    private const string Vazio = " ";

    [ModuleInitializer]
    internal static void Isolar()
    {
        Environment.SetEnvironmentVariable("ConnectionStrings__Banco", Vazio);
        Environment.SetEnvironmentVariable("Admin__Email", Vazio);
        Environment.SetEnvironmentVariable("Email__ChaveDaApi", Vazio);
    }
}

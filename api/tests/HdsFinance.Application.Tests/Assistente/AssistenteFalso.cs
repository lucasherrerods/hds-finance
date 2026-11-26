using HdsFinance.Application.Assistente;

namespace HdsFinance.Application.Tests.Assistente;

/// <summary>Responde sempre o mesmo texto e guarda os pedidos, para os testes verem o que iria para a IA.</summary>
internal sealed class AssistenteFalso(string? resposta) : IAssistente
{
    public List<string> Pedidos { get; } = [];

    public Task<string?> GerarAsync(string instrucoes, string pedido, bool json = false, CancellationToken cancelamento = default)
    {
        Pedidos.Add(pedido);
        return Task.FromResult(resposta);
    }
}

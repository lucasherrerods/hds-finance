using System.Collections.Concurrent;

namespace HdsFinance.Application.Assistente;

/// <summary>Porta: um modelo de linguagem. Devolve nulo quando não está configurado ou falhou, e quem chama segue sem o texto.</summary>
public interface IAssistente
{
    /// <summary>Com <paramref name="json"/>, pede a resposta como um objeto JSON.</summary>
    Task<string?> GerarAsync(string instrucoes, string pedido, bool json = false, CancellationToken cancelamento = default);
}

/// <summary>Porta: um canal de mensagem do admin, como o Telegram. Nunca lança: falha vira falso.</summary>
public interface IMensageiro
{
    bool Configurado { get; }

    Task<bool> EnviarTextoAsync(string texto, CancellationToken cancelamento = default);

    Task<bool> EnviarArquivoAsync(string nome, byte[] conteudo, string legenda, CancellationToken cancelamento = default);
}

/// <summary>
/// Guarda as respostas da IA pelo pedido exato. Se os números do mês mudam, o pedido muda e a IA é chamada de novo;
/// senão, abrir o painel várias vezes não gasta a cota gratuita. Some quando a api reinicia.
/// </summary>
public sealed class MemoriaDoAssistente
{
    private const int Limite = 200;
    private readonly ConcurrentDictionary<string, string> _respostas = new();

    public async Task<string?> ObterAsync(IAssistente assistente, string instrucoes, string pedido, bool json, CancellationToken cancelamento)
    {
        var chave = $"{json}\n{instrucoes}\n{pedido}";
        if (_respostas.TryGetValue(chave, out var guardada))
        {
            return guardada;
        }

        var resposta = await assistente.GerarAsync(instrucoes, pedido, json, cancelamento);
        if (resposta is not null)
        {
            if (_respostas.Count >= Limite)
            {
                _respostas.Clear();
            }

            _respostas[chave] = resposta;
        }

        return resposta;
    }
}

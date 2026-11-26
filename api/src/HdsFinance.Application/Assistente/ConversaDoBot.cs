using HdsFinance.Application.Admin;
using HdsFinance.Domain;

namespace HdsFinance.Application.Assistente;

/// <summary>
/// O que o bot responde a cada mensagem do admin. Comandos não usam IA; texto livre vira pergunta.
/// Quem chama já conferiu que a mensagem veio do chat do admin.
/// </summary>
public sealed class ConversaDoBot(FecharMes fechar, ResponderPergunta responder, TimeProvider tempo)
{
    public const string Ajuda =
        "Comandos:\n" +
        "/mes — resumo, análise e alertas do mês mais recente\n" +
        "/categoria <nome> — quanto saiu na categoria ou grupo este ano\n" +
        "Ou pergunte em texto livre, como \"quanto gastei com Vestuário em 2026?\".";

    public async Task<string> ResponderAsync(string? mensagem, CancellationToken cancelamento = default)
    {
        var texto = mensagem?.Trim() ?? string.Empty;
        var (comando, argumento) = Separar(texto);
        switch (comando)
        {
            case "/start" or "/ajuda" or "/help":
                return Ajuda;
            case "/mes":
                return await MesAsync(cancelamento);
            case "/categoria":
                return await CategoriaAsync(argumento, cancelamento);
            default:
                return await responder.ExecutarAsync(await fechar.MesesAsync(cancelamento), texto, cancelamento);
        }
    }

    private async Task<string> MesAsync(CancellationToken cancelamento)
    {
        var meses = await fechar.MesesAsync(cancelamento);
        if (meses.Count == 0)
        {
            return "Ainda não há extratos no histórico.";
        }

        var ultimo = meses[^1];
        var resumo = ResponderPergunta.Responder(meses, new Interpretacao(TipoDePergunta.Resumo, null, ultimo.Mes, ultimo.Mes));
        var analise = await fechar.AnalisarAsync(ultimo.Mes, cancelamento);
        return analise is null ? resumo : $"{resumo}\n\n{analise.Mensagem()}";
    }

    private async Task<string> CategoriaAsync(string nome, CancellationToken cancelamento)
    {
        if (ConsultaDeGastos.NomeConhecido(nome) is not { } conhecido)
        {
            return "Categoria ou grupo não encontrado. Use o nome como aparece no painel, por exemplo /categoria Alimentação.";
        }

        var ano = tempo.GetLocalNow().Year;
        var meses = await fechar.MesesAsync(cancelamento);
        return ResponderPergunta.Responder(meses, new Interpretacao(TipoDePergunta.Gasto, conhecido, new MesDeReferencia(ano, 1), new MesDeReferencia(ano, 12)));
    }

    /// <summary>"/categoria@MeuBot Lazer" vira ("/categoria", "Lazer"). Texto sem barra não é comando.</summary>
    public static (string Comando, string Argumento) Separar(string texto)
    {
        if (!texto.StartsWith('/'))
        {
            return (string.Empty, texto);
        }

        var espaco = texto.IndexOf(' ');
        var comando = espaco < 0 ? texto : texto[..espaco];
        var arroba = comando.IndexOf('@');
        return ((arroba < 0 ? comando : comando[..arroba]).ToLowerInvariant(), espaco < 0 ? string.Empty : texto[(espaco + 1)..].Trim());
    }
}

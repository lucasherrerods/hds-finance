using System.Text;
using HdsFinance.Domain;

namespace HdsFinance.Application.Assistente;

/// <summary>Alertas calculados e, quando a IA responde, um comentário curto sobre o mês.</summary>
public sealed record AnaliseDoMes(MesDeReferencia Mes, IReadOnlyList<Alerta> Alertas, string? Comentario)
{
    /// <summary>O texto da mensagem do fechamento: comentário e alertas, sem descrição de transação além das assinaturas.</summary>
    public string Mensagem()
    {
        var texto = new StringBuilder($"Fechamento de {Formato.Mes(Mes)}");
        if (Comentario is { Length: > 0 })
        {
            texto.Append("\n\n").Append(Comentario);
        }

        if (Alertas.Count > 0)
        {
            texto.Append("\n\nAlertas:");
            foreach (var alerta in Alertas)
            {
                texto.Append("\n• ").Append(alerta.Texto);
            }
        }

        return texto.ToString();
    }
}

/// <summary>
/// Monta a análise de um mês. Para a IA vão só os totais por grupo e os alertas de categoria:
/// nenhuma descrição de transação sai daqui.
/// </summary>
public sealed class AnalisarMes(IAssistente assistente, MemoriaDoAssistente memoria, Categorizador? categorizador = null)
{
    public const string Instrucoes =
        "Você comenta as finanças pessoais do mês de uma pessoa, em português do Brasil, em no máximo 4 frases curtas. " +
        "Use só os números recebidos, sem inventar valores nem dar conselho de investimento. " +
        "Diga o que mais pesou, o que mudou em relação à média e, se fizer sentido, uma sugestão prática de economia. " +
        "Texto simples, sem markdown e sem saudação.";

    public async Task<AnaliseDoMes?> ExecutarAsync(
        IReadOnlyList<ResumoMensal> meses, IReadOnlyList<Transacao> transacoes, MesDeReferencia mes, CancellationToken cancelamento = default)
    {
        if (PanoramaDoMes.Montar(meses, mes) is not { } panorama)
        {
            return null;
        }

        var alertas = AlertasDoMes.Calcular(meses, transacoes, mes, categorizador ?? Categorizador.Padrao);
        var comentario = await memoria.ObterAsync(assistente, Instrucoes, Pedido(panorama, alertas), false, cancelamento);
        return new AnaliseDoMes(mes, alertas, comentario?.Trim());
    }

    /// <summary>Público para os testes conferirem que nenhuma descrição de transação vai para a IA.</summary>
    public static string Pedido(PanoramaDoMes panorama, IReadOnlyList<Alerta> alertas)
    {
        var texto = new StringBuilder();
        texto.AppendLine($"Mês: {Formato.Mes(panorama.Mes)}");
        texto.AppendLine($"Entradas: {Formato.Moeda(panorama.Entradas)}");
        texto.AppendLine($"Saídas: {Formato.Moeda(panorama.Saidas)}");
        if (panorama.MesesNaMedia > 0)
        {
            texto.AppendLine($"Média das saídas nos {panorama.MesesNaMedia} meses anteriores: {Formato.Moeda(panorama.MediaDasSaidas)}");
        }

        texto.AppendLine("Gasto por grupo (mês atual | média anterior):");
        foreach (var grupo in panorama.Grupos)
        {
            texto.AppendLine($"- {grupo.Grupo}: {Formato.Moeda(grupo.Atual)} | {Formato.Moeda(grupo.Media)}");
        }

        var deCategoria = alertas.Where(a => a.Tipo is TipoDeAlerta.GastoAcimaDaMedia or TipoDeAlerta.CategoriaNova).ToList();
        if (deCategoria.Count > 0)
        {
            texto.AppendLine("Alertas:");
            foreach (var alerta in deCategoria)
            {
                texto.AppendLine($"- {alerta.Texto}");
            }
        }

        return texto.ToString();
    }
}

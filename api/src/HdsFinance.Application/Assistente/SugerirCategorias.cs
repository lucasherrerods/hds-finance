using System.Text;
using System.Text.Json;
using HdsFinance.Domain;

namespace HdsFinance.Application.Assistente;

public sealed record SugestaoDeCategoria(string Descricao, string Categoria, int Quantidade, decimal Valor);

/// <summary>
/// Pede à IA uma categoria para os gastos que as regras não reconheceram. Só sugere: o admin aceita no painel,
/// e o aceite vira categoria aprendida, então a mesma descrição não volta para a IA.
/// Aqui a descrição vai para a IA, por isso o caso de uso só existe na área admin, com os dados do próprio admin.
/// </summary>
public sealed class SugerirCategorias(IAssistente assistente, MemoriaDoAssistente memoria, Categorizador categorizador)
{
    /// <summary>Para o pedido caber no limite gratuito, vão as descrições que mais pesam.</summary>
    public const int Limite = 40;

    public const string Instrucoes =
        "Você classifica gastos de extrato bancário brasileiro. Para cada descrição recebida, escolha exatamente uma " +
        "categoria da lista dada, ou deixe de fora se não tiver segurança. Responda só com JSON no formato " +
        "{\"sugestoes\":[{\"descricao\":\"...\",\"categoria\":\"...\"}]}, copiando a descrição como veio.";

    public async Task<IReadOnlyList<SugestaoDeCategoria>> ExecutarAsync(IEnumerable<Transacao> transacoes, CancellationToken cancelamento = default)
    {
        var semCategoria = transacoes
            .Where(t => t.EhGasto && categorizador.Categorizar(t) == Categorizador.SemCategoria)
            .GroupBy(t => t.Descricao.Trim())
            .Select(g => new SugestaoDeCategoria(g.Key, string.Empty, g.Count(), -g.Sum(t => t.Valor)))
            .OrderByDescending(s => s.Valor)
            .Take(Limite)
            .ToList();
        if (semCategoria.Count == 0)
        {
            return [];
        }

        var escolhas = categorizador.Categorias.Where(c => c != Categorizador.SemCategoria).ToList();
        var pedido = new StringBuilder("Categorias: ").AppendJoin(" | ", escolhas).AppendLine().AppendLine("Descrições:");
        foreach (var item in semCategoria)
        {
            pedido.AppendLine(item.Descricao);
        }

        var resposta = await memoria.ObterAsync(assistente, Instrucoes, pedido.ToString(), true, cancelamento);
        var porDescricao = semCategoria.ToDictionary(s => s.Descricao);
        return Ler(resposta)
            .Where(s => porDescricao.ContainsKey(s.Descricao) && escolhas.Contains(s.Categoria))
            .DistinctBy(s => s.Descricao)
            .Select(s => porDescricao[s.Descricao] with { Categoria = s.Categoria })
            .OrderByDescending(s => s.Valor)
            .ToList();
    }

    /// <summary>Resposta fora do formato vira lista vazia: a IA nunca derruba o painel.</summary>
    private static IEnumerable<(string Descricao, string Categoria)> Ler(string? resposta)
    {
        if (string.IsNullOrWhiteSpace(resposta))
        {
            return [];
        }

        try
        {
            using var json = JsonDocument.Parse(resposta);
            if (json.RootElement.ValueKind != JsonValueKind.Object || !json.RootElement.TryGetProperty("sugestoes", out var lista) || lista.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            return lista.EnumerateArray()
                .Where(s => s.ValueKind == JsonValueKind.Object)
                .Select(s => (s.Texto("descricao"), s.Texto("categoria")))
                .Where(s => s.Item1.Length > 0 && s.Item2.Length > 0)
                .ToList();
        }
        catch (JsonException)
        {
            return [];
        }
    }
}

using System.Text;
using System.Text.Json;
using HdsFinance.Domain;

namespace HdsFinance.Application.Assistente;

public enum TipoDePergunta
{
    Nenhuma,
    Gasto,
    Resumo,
    Maiores,
}

/// <summary>O que a pergunta pede, já em termos do histórico.</summary>
public sealed record Interpretacao(TipoDePergunta Tipo, string? Nome, MesDeReferencia De, MesDeReferencia Ate);

/// <summary>
/// Responde perguntas em texto livre sobre o histórico. A IA só traduz a pergunta numa consulta;
/// o número sai sempre das contas do próprio sistema, então ela não tem como inventar valor.
/// Para a IA vão a pergunta, a data de hoje e os nomes das categorias, nunca transações.
/// </summary>
public sealed class ResponderPergunta(IAssistente assistente, MemoriaDoAssistente memoria, TimeProvider tempo)
{
    public const string SemIa = "O assistente de IA não está disponível agora. Tente /mes ou /categoria <nome>.";

    public const string NaoEntendi =
        "Não consegui entender a pergunta. Exemplos: \"quanto gastei com Vestuário em 2026?\", " +
        "\"resumo de outubro\", \"onde mais gastei nos últimos 3 meses?\".";

    public const string Instrucoes =
        "Você traduz perguntas sobre finanças pessoais numa consulta. Responda só com JSON no formato " +
        "{\"tipo\":\"gasto|resumo|maiores|nenhuma\",\"nome\":\"categoria ou grupo, ou null\",\"de\":\"AAAA-MM\",\"ate\":\"AAAA-MM\"}. " +
        "gasto = quanto foi gasto numa categoria ou grupo; resumo = entradas e saídas de um mês (use de = ate); " +
        "maiores = onde mais se gastou no período; nenhuma = qualquer outra coisa. " +
        "O nome precisa ser um da lista, escrito igual. Sem período na pergunta, use o mês mais recente do histórico.";

    public async Task<string> ExecutarAsync(IReadOnlyList<ResumoMensal> meses, string pergunta, CancellationToken cancelamento = default)
    {
        if (meses.Count == 0)
        {
            return "Ainda não há extratos no histórico.";
        }

        if (string.IsNullOrWhiteSpace(pergunta))
        {
            return NaoEntendi;
        }

        var hoje = DateOnly.FromDateTime(tempo.GetLocalNow().Date);
        var pedido = new StringBuilder()
            .AppendLine($"Hoje: {hoje:yyyy-MM-dd}")
            .AppendLine($"Histórico de {meses[0].Mes} a {meses[^1].Mes}")
            .Append("Grupos e categorias: ")
            .AppendJoin(" | ", GruposDeCategoria.Todos.SelectMany(g => g.Categorias.Prepend(g.Nome)).Distinct())
            .AppendLine()
            .Append("Pergunta: ").Append(pergunta.Trim()[..Math.Min(pergunta.Trim().Length, 300)])
            .ToString();

        var resposta = await memoria.ObterAsync(assistente, Instrucoes, pedido, true, cancelamento);
        if (resposta is null)
        {
            return SemIa;
        }

        return Interpretar(resposta, meses[^1].Mes) is { } interpretacao ? Responder(meses, interpretacao) : NaoEntendi;
    }

    /// <summary>A resposta da IA, conferida: tipo conhecido, nome que existe e meses válidos.</summary>
    public static Interpretacao? Interpretar(string resposta, MesDeReferencia ultimo)
    {
        try
        {
            using var json = JsonDocument.Parse(resposta);
            var raiz = json.RootElement;
            if (raiz.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            var tipo = raiz.Texto("tipo") switch
            {
                "gasto" => TipoDePergunta.Gasto,
                "resumo" => TipoDePergunta.Resumo,
                "maiores" => TipoDePergunta.Maiores,
                _ => TipoDePergunta.Nenhuma,
            };
            var ate = MesDeReferencia.TentarLer(raiz.Texto("ate")) ?? ultimo;
            var de = MesDeReferencia.TentarLer(raiz.Texto("de")) ?? ate;
            if (ate.AntesDe(de))
            {
                (de, ate) = (ate, de);
            }

            var nome = ConsultaDeGastos.NomeConhecido(raiz.Texto("nome"));
            return tipo == TipoDePergunta.Gasto && nome is null ? null : new Interpretacao(tipo, nome, de, ate);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public static string Responder(IReadOnlyList<ResumoMensal> meses, Interpretacao pergunta)
    {
        var periodo = pergunta.De == pergunta.Ate ? Formato.Mes(pergunta.De) : $"{Formato.Mes(pergunta.De)} a {Formato.Mes(pergunta.Ate)}";
        var doPeriodo = meses.Where(m => !m.Mes.AntesDe(pergunta.De) && !pergunta.Ate.AntesDe(m.Mes)).ToList();
        if (pergunta.Tipo != TipoDePergunta.Nenhuma && doPeriodo.Count == 0)
        {
            return $"Não há extratos de {periodo} no histórico.";
        }

        switch (pergunta.Tipo)
        {
            case TipoDePergunta.Gasto:
                return $"{pergunta.Nome}: {Formato.Moeda(ConsultaDeGastos.NoPeriodo(meses, pergunta.Nome!, pergunta.De, pergunta.Ate))} em {periodo}.";
            case TipoDePergunta.Resumo:
                var mes = doPeriodo[^1];
                return $"{Formato.Mes(mes.Mes)}: entrou {Formato.Moeda(mes.Entradas)}, saiu {Formato.Moeda(mes.Saidas)}, " +
                    $"sobrou {Formato.Moeda(mes.Resultado)}.";
            case TipoDePergunta.Maiores:
                var maiores = doPeriodo.SelectMany(m => m.GastosPorCategoria)
                    .GroupBy(g => g.Categoria)
                    .Select(g => (Categoria: g.Key, Valor: g.Sum(x => x.Valor)))
                    .OrderByDescending(g => g.Valor)
                    .Take(5)
                    .Select((g, i) => $"{i + 1}. {g.Categoria}: {Formato.Moeda(g.Valor)}");
                return $"Onde mais saiu dinheiro em {periodo}:\n{string.Join('\n', maiores)}";
            default:
                return NaoEntendi;
        }
    }
}

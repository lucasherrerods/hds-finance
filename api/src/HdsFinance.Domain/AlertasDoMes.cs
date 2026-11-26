namespace HdsFinance.Domain;

public enum TipoDeAlerta
{
    GastoAcimaDaMedia,
    CategoriaNova,
    AssinaturaNova,
    AssinaturaMaisCara,
}

/// <summary>
/// Algo fora do padrão no mês. Assunto é a categoria ou, nas assinaturas, a descrição da transação.
/// Referência é a média dos meses anteriores ou o valor do mês passado, conforme o tipo.
/// </summary>
public sealed record Alerta(TipoDeAlerta Tipo, string Assunto, decimal Valor, decimal? Referencia)
{
    public string Texto => Tipo switch
    {
        TipoDeAlerta.GastoAcimaDaMedia => $"{Assunto}: {Formato.Moeda(Valor)}, acima da média de {Formato.Moeda(Referencia ?? 0m)}.",
        TipoDeAlerta.CategoriaNova => $"{Assunto}: {Formato.Moeda(Valor)}, sem gasto nos meses anteriores.",
        TipoDeAlerta.AssinaturaNova => $"Assinatura nova: {Assunto} ({Formato.Moeda(Valor)}).",
        TipoDeAlerta.AssinaturaMaisCara => $"Assinatura mais cara: {Assunto}, de {Formato.Moeda(Referencia ?? 0m)} para {Formato.Moeda(Valor)}.",
        _ => Assunto,
    };
}

/// <summary>
/// Compara o mês com os anteriores e aponta o que fugiu do padrão. Cálculo puro: a IA só escreve o texto
/// em volta, nunca decide o que é alerta.
/// </summary>
public static class AlertasDoMes
{
    /// <summary>Quantos meses anteriores entram na média.</summary>
    public const int MesesDaMedia = 3;

    /// <summary>Quanto acima da média, em proporção, já vira alerta.</summary>
    public const decimal Aumento = 0.3m;

    /// <summary>Diferença mínima em reais, para centavos não virarem alerta.</summary>
    public const decimal DiferencaMinima = 50m;

    /// <summary>O grupo cujas categorias contam como assinatura.</summary>
    public const string GrupoDasAssinaturas = "Serviços digitais";

    public static IReadOnlyList<Alerta> Calcular(
        IReadOnlyList<ResumoMensal> meses, IEnumerable<Transacao> transacoes, MesDeReferencia mes, Categorizador categorizador)
    {
        var atual = meses.FirstOrDefault(m => m.Mes == mes);
        if (atual is null)
        {
            return [];
        }

        var anteriores = meses.Where(m => m.Mes.AntesDe(mes)).TakeLast(MesesDaMedia).ToList();
        return [.. DeCategorias(atual, anteriores), .. DeAssinaturas(transacoes.ToList(), mes, anteriores.Select(m => m.Mes).ToList(), categorizador)];
    }

    private static IEnumerable<Alerta> DeCategorias(ResumoMensal atual, IReadOnlyList<ResumoMensal> anteriores)
    {
        if (anteriores.Count == 0)
        {
            yield break;
        }

        foreach (var gasto in atual.GastosPorCategoria)
        {
            var media = anteriores.Sum(m => m.GastosPorCategoria.FirstOrDefault(g => g.Categoria == gasto.Categoria)?.Valor ?? 0m) / anteriores.Count;
            if (gasto.Valor - media < DiferencaMinima)
            {
                continue;
            }

            if (media == 0m)
            {
                yield return new Alerta(TipoDeAlerta.CategoriaNova, gasto.Categoria, gasto.Valor, null);
            }
            else if (gasto.Valor >= media * (1 + Aumento))
            {
                yield return new Alerta(TipoDeAlerta.GastoAcimaDaMedia, gasto.Categoria, gasto.Valor, decimal.Round(media, 2));
            }
        }
    }

    private static IEnumerable<Alerta> DeAssinaturas(
        IReadOnlyList<Transacao> transacoes, MesDeReferencia mes, IReadOnlyList<MesDeReferencia> anteriores, Categorizador categorizador)
    {
        if (anteriores.Count == 0)
        {
            yield break;
        }

        var assinaturas = transacoes
            .Where(t => t.EhGasto && GruposDeCategoria.GrupoDe(categorizador.Categorizar(t)) == GrupoDasAssinaturas)
            .GroupBy(t => Categorizador.ChaveDaDescricao(t.Descricao));

        foreach (var assinatura in assinaturas)
        {
            var doMes = assinatura.Where(t => mes.Contem(t.Data)).ToList();
            if (doMes.Count == 0)
            {
                continue;
            }

            var valor = -doMes.Sum(t => t.Valor);
            var antes = assinatura.Where(t => anteriores.Any(a => a.Contem(t.Data))).ToList();
            if (antes.Count == 0)
            {
                yield return new Alerta(TipoDeAlerta.AssinaturaNova, doMes[0].Descricao, valor, null);
                continue;
            }

            var ultimoMes = anteriores.Last();
            var noMesPassado = assinatura.Where(t => ultimoMes.Contem(t.Data)).ToList();
            var passado = -noMesPassado.Sum(t => t.Valor);
            if (noMesPassado.Count > 0 && valor > passado)
            {
                yield return new Alerta(TipoDeAlerta.AssinaturaMaisCara, doMes[0].Descricao, valor, passado);
            }
        }
    }
}

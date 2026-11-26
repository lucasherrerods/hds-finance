namespace HdsFinance.Domain;

/// <summary>Um grupo e as categorias dele, na ordem em que aparecem para escolher.</summary>
public sealed record GrupoDeCategoria(string Nome, IReadOnlyList<string> Categorias);

/// <summary>
/// Junta as categorias finas em grupos (Supermercado e Delivery em Alimentação). O grupo é calculado na leitura,
/// então vale também para o que já está guardado. O nome de um grupo usado como categoria, como as escolhas
/// antigas ("Alimentação"), cai no próprio grupo. Uma categoria desconhecida cai em "Outros".
/// </summary>
public static class GruposDeCategoria
{
    public const string Outros = "Outros";

    public static IReadOnlyList<GrupoDeCategoria> Todos { get; } =
    [
        new("Alimentação", ["Restaurantes, bares e lanchonetes", "Supermercado", "Delivery de alimentos", "Alimentos e bebidas"]),
        new("Transporte", ["Transporte público", "Táxi e transporte privado urbano", "Combustível", "Pedágios e pagamentos no veículo"]),
        new("Moradia", ["Aluguel e condomínio", "Contas da casa", "Internet e telefone"]),
        new("Saúde", ["Farmácia", "Consultas e planos de saúde", "Academia"]),
        new("Serviços digitais", ["Streaming de vídeo", "Streaming de música", "Serviços digitais"]),
        new("Compras", ["Compras online", "Lojas"]),
        new("Lazer", ["Cinema e eventos", "Jogos"]),
        new("Educação", ["Cursos", "Livros"]),
        new("Pets", ["Pet shop e veterinário"]),
        new("Finanças", ["Tarifas bancárias", "Juros e IOF", "Impostos", Emprestimo.Categoria]),
        new(Outros, [Categorizador.SemCategoria]),
    ];

    // Nomes que já foram categoria antes dos grupos existirem, e os que não são gasto: esses são o próprio grupo.
    private static readonly Dictionary<string, string> Antigos = new()
    {
        [TransacaoCategorizada.CategoriaDeEntrada] = TransacaoCategorizada.CategoriaDeEntrada,
        [TransacaoCategorizada.CategoriaDeMovimentacaoInterna] = TransacaoCategorizada.CategoriaDeMovimentacaoInterna,
        ["Assinaturas"] = "Serviços digitais",
        ["Tarifas e impostos"] = "Finanças",
    };

    private static readonly Dictionary<string, string> PorCategoria = Todos
        .SelectMany(g => g.Categorias.Select(c => (c, g.Nome)).Append((g.Nome, g.Nome)))
        .Concat(Antigos.Select(a => (a.Key, a.Value)))
        .DistinctBy(p => p.Item1)
        .ToDictionary(p => p.Item1, p => p.Item2);

    public static string GrupoDe(string categoria) =>
        PorCategoria.TryGetValue(categoria, out var grupo) ? grupo : Outros;
}

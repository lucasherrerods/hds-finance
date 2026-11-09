namespace HdsFinance.Domain;

public sealed record RegraDeCategoria(string Categoria, IReadOnlyList<string> Palavras);

public sealed record GastoPorCategoria(string Categoria, decimal Valor);

/// <summary>Uma correção feita pela pessoa: aquela descrição, inteira, vai sempre para aquela categoria.</summary>
public sealed record CategoriaAprendida(string Descricao, string Categoria);

/// <summary>
/// A primeira regra com alguma palavra presente na descrição define a categoria.
/// As palavras são comparadas inteiras, sem acento e sem diferenciar maiúsculas.
/// </summary>
public sealed class Categorizador
{
    public const string SemCategoria = "Sem categoria";

    /// <summary>
    /// Regras para os nomes que mais aparecem no extrato. A ordem importa: "amazon prime" em Assinaturas
    /// precisa vir antes de "amazon" em Compras.
    /// </summary>
    public static Categorizador Padrao { get; } = new(
    [
        new RegraDeCategoria("Assinaturas",
        [
            "netflix", "spotify", "youtube", "disney", "prime video", "amazon prime", "icloud", "apple com", "hbo",
            "globoplay", "deezer", "paramount", "chatgpt", "openai",
        ]),
        new RegraDeCategoria("Alimentação",
        [
            "mercado", "supermercado", "atacadao", "assai", "carrefour", "pao de acucar", "hortifruti", "acougue",
            "padaria", "restaurante", "lanchonete", "pizzaria", "hamburgueria", "cafeteria", "ifood", "ifd", "rappi",
            "ze delivery", "zedelivery",
        ]),
        new RegraDeCategoria("Transporte",
        [
            "uber", "99app", "99pop", "99 taxi", "cabify", "posto", "combustivel", "ipiranga", "shell", "petrobras",
            "estacionamento", "pedagio", "sem parar", "veloe", "conectcar", "metro", "onibus", "bilhete unico",
        ]),
        new RegraDeCategoria("Moradia",
        [
            "aluguel", "condominio", "energia", "luz", "enel", "cemig", "copel", "light", "agua", "sabesp", "gas",
            "comgas", "internet", "vivo", "claro", "tim",
        ]),
        new RegraDeCategoria("Saúde",
        [
            "farmacia", "drogaria", "drogasil", "raia", "pague menos", "hospital", "clinica", "laboratorio",
            "dentista", "odonto", "unimed", "amil", "academia", "smart fit", "smartfit",
        ]),
        new RegraDeCategoria("Lazer", ["cinema", "ingresso", "sympla", "teatro", "steam", "playstation", "xbox", "nintendo"]),
        new RegraDeCategoria("Educação", ["escola", "faculdade", "curso", "udemy", "alura", "livraria"]),
        new RegraDeCategoria("Pets", ["petz", "cobasi", "petshop", "pet shop", "veterinario"]),
        new RegraDeCategoria("Tarifas e impostos", ["tarifa", "iof", "juros", "anuidade", "imposto", "iptu", "ipva", "darf"]),
        new RegraDeCategoria("Compras",
        [
            "amazon", "mercado livre", "mercadolivre", "shopee", "magalu", "magazine luiza", "americanas",
            "aliexpress", "shein", "loja",
        ]),
    ]);

    private readonly (string Categoria, string[] Palavras)[] _regras;
    private readonly IReadOnlyDictionary<string, string> _aprendidas = new Dictionary<string, string>();

    public Categorizador(IEnumerable<RegraDeCategoria> regras)
    {
        _regras = regras
            .Select(r => (r.Categoria, r.Palavras.Select(TextoNormalizado.ParaComparar).Where(p => p.Length > 0).ToArray()))
            .ToArray();
    }

    private Categorizador(Categorizador original, IReadOnlyDictionary<string, string> aprendidas)
    {
        _regras = original._regras;
        _aprendidas = aprendidas;
    }

    /// <summary>As categorias que as regras conhecem, na ordem delas, e "Sem categoria" no fim.</summary>
    public IReadOnlyList<string> Categorias => [.. _regras.Select(r => r.Categoria).Distinct(), SemCategoria];

    /// <summary>A forma da descrição usada para lembrar uma correção: sem acento, caixa nem pontuação.</summary>
    public static string ChaveDaDescricao(string descricao) => TextoNormalizado.ParaComparar(descricao);

    /// <summary>As mesmas regras, com as correções da pessoa na frente. Correções novas substituem as antigas.</summary>
    public Categorizador ComAprendidas(IEnumerable<CategoriaAprendida> aprendidas)
    {
        var juntas = new Dictionary<string, string>(_aprendidas);
        foreach (var aprendida in aprendidas)
        {
            juntas[ChaveDaDescricao(aprendida.Descricao)] = aprendida.Categoria;
        }

        return new Categorizador(this, juntas);
    }

    public string Categorizar(Transacao transacao) =>
        _aprendidas.TryGetValue(ChaveDaDescricao(transacao.Descricao), out var aprendida)
            ? aprendida
            : _regras.FirstOrDefault(r => TextoNormalizado.ContemAlgum(transacao.Descricao, r.Palavras)).Categoria ?? SemCategoria;
}

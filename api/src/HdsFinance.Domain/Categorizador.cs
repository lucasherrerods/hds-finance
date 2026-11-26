namespace HdsFinance.Domain;

public sealed record RegraDeCategoria(string Categoria, IReadOnlyList<string> Palavras);

public sealed record GastoPorCategoria(string Categoria, decimal Valor)
{
    /// <summary>Do maior para o menor, com os estornos abatidos.</summary>
    public static IReadOnlyList<GastoPorCategoria> Somar(IEnumerable<Transacao> gastos, Categorizador categorizador) => gastos
        .GroupBy(categorizador.Categorizar)
        .Select(g => new GastoPorCategoria(g.Key, -g.Sum(t => t.Valor)))
        .Where(g => g.Valor > 0)
        .OrderByDescending(g => g.Valor)
        .ToList();
}

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
    /// Regras para os nomes que mais aparecem no extrato. Cada regra dá uma categoria fina, e cada categoria
    /// pertence a um grupo (<see cref="GruposDeCategoria"/>). A ordem importa: "amazon prime" precisa vir antes
    /// de "amazon", e "mercado livre" antes de "mercado".
    /// </summary>
    public static Categorizador Padrao { get; } = new(
    [
        new RegraDeCategoria("Streaming de vídeo",
            ["netflix", "youtube", "disney", "prime video", "amazon prime", "hbo", "globoplay", "paramount"]),
        new RegraDeCategoria("Streaming de música", ["spotify", "deezer"]),
        new RegraDeCategoria("Serviços digitais", ["icloud", "apple com", "chatgpt", "openai", "google one"]),
        new RegraDeCategoria("Compras online",
        [
            "amazon", "mercado livre", "mercadolivre", "shopee", "magalu", "magazine luiza", "americanas",
            "aliexpress", "shein",
        ]),
        new RegraDeCategoria("Delivery de alimentos", ["ifood", "ifd", "rappi", "ze delivery", "zedelivery"]),
        new RegraDeCategoria("Supermercado", ["mercado", "supermercado", "atacadao", "assai", "carrefour", "pao de acucar"]),
        new RegraDeCategoria("Restaurantes, bares e lanchonetes",
            ["restaurante", "lanchonete", "pizzaria", "hamburgueria", "cafeteria"]),
        new RegraDeCategoria("Alimentos e bebidas", ["padaria", "hortifruti", "acougue"]),
        new RegraDeCategoria("Táxi e transporte privado urbano", ["uber", "99app", "99pop", "99 taxi", "cabify"]),
        new RegraDeCategoria("Combustível", ["posto", "combustivel", "ipiranga", "shell", "petrobras"]),
        new RegraDeCategoria("Pedágios e pagamentos no veículo",
            ["estacionamento", "pedagio", "sem parar", "veloe", "conectcar"]),
        new RegraDeCategoria("Transporte público", ["metro", "onibus", "bilhete unico"]),
        new RegraDeCategoria("Aluguel e condomínio", ["aluguel", "condominio"]),
        new RegraDeCategoria("Contas da casa",
            ["energia", "luz", "enel", "cemig", "copel", "light", "agua", "sabesp", "gas", "comgas"]),
        new RegraDeCategoria("Internet e telefone", ["internet", "vivo", "claro", "tim"]),
        new RegraDeCategoria("Farmácia", ["farmacia", "drogaria", "drogasil", "raia", "pague menos"]),
        new RegraDeCategoria("Academia", ["academia", "smart fit", "smartfit"]),
        new RegraDeCategoria("Consultas e planos de saúde",
            ["hospital", "clinica", "laboratorio", "dentista", "odonto", "unimed", "amil"]),
        new RegraDeCategoria("Cinema e eventos", ["cinema", "ingresso", "sympla", "teatro"]),
        new RegraDeCategoria("Jogos", ["steam", "playstation", "xbox", "nintendo"]),
        new RegraDeCategoria("Cursos", ["escola", "faculdade", "curso", "udemy", "alura"]),
        new RegraDeCategoria("Livros", ["livraria"]),
        new RegraDeCategoria("Pet shop e veterinário", ["petz", "cobasi", "petshop", "pet shop", "veterinario"]),
        new RegraDeCategoria("Tarifas bancárias", ["tarifa", "anuidade"]),
        new RegraDeCategoria("Juros e IOF", ["iof", "juros"]),
        new RegraDeCategoria("Impostos", ["imposto", "iptu", "ipva", "darf"]),
        new RegraDeCategoria("Lojas", ["loja"]),
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

    /// <summary>
    /// As categorias que as regras conhecem, na ordem delas, depois as dos grupos que não têm regra
    /// (dá para escolher mesmo sem reconhecimento automático), e "Sem categoria" no fim.
    /// </summary>
    public IReadOnlyList<string> Categorias =>
    [
        .. _regras.Select(r => r.Categoria)
            .Append(Emprestimo.Categoria)
            .Concat(GruposDeCategoria.Todos.SelectMany(g => g.Categorias))
            .Where(c => c != SemCategoria)
            .Distinct(),
        SemCategoria,
    ];

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
        transacao.Categoria is { } escolhida && escolhida != TransacaoCategorizada.CategoriaDeEntrada ? escolhida
        : _aprendidas.TryGetValue(ChaveDaDescricao(transacao.Descricao), out var aprendida)
            ? aprendida
            : Emprestimo.NaDescricao(transacao.Descricao) ? Emprestimo.Categoria
            : _regras.FirstOrDefault(r => TextoNormalizado.ContemAlgum(transacao.Descricao, r.Palavras)).Categoria ?? SemCategoria;
}

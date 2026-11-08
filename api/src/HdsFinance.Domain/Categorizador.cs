namespace HdsFinance.Domain;

public sealed record RegraDeCategoria(string Categoria, IReadOnlyList<string> Palavras);

public sealed record GastoPorCategoria(string Categoria, decimal Valor);

/// <summary>
/// A primeira regra com alguma palavra presente na descrição define a categoria.
/// As palavras são comparadas inteiras, sem acento e sem diferenciar maiúsculas.
/// </summary>
public sealed class Categorizador
{
    public const string SemCategoria = "Sem categoria";

    public static Categorizador Padrao { get; } = new(
    [
        new RegraDeCategoria("Alimentação", ["mercado", "supermercado", "padaria", "restaurante", "ifood", "lanchonete", "acougue", "hortifruti"]),
        new RegraDeCategoria("Transporte", ["uber", "99app", "posto", "combustivel", "estacionamento", "metro", "onibus"]),
        new RegraDeCategoria("Moradia", ["aluguel", "condominio", "energia", "luz", "agua", "gas", "internet"]),
        new RegraDeCategoria("Saúde", ["farmacia", "drogaria", "hospital", "clinica", "laboratorio", "academia"]),
        new RegraDeCategoria("Assinaturas", ["netflix", "spotify", "youtube", "disney", "prime video", "icloud"]),
        new RegraDeCategoria("Compras", ["amazon", "mercado livre", "shopee", "magalu", "loja"]),
    ]);

    private readonly (string Categoria, string[] Palavras)[] _regras;

    public Categorizador(IEnumerable<RegraDeCategoria> regras)
    {
        _regras = regras
            .Select(r => (r.Categoria, r.Palavras.Select(TextoNormalizado.De).Where(p => p.Length > 0).ToArray()))
            .ToArray();
    }

    public string Categorizar(Transacao transacao) =>
        _regras.FirstOrDefault(r => TextoNormalizado.ContemAlgum(transacao.Descricao, r.Palavras)).Categoria ?? SemCategoria;
}

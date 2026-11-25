namespace HdsFinance.Domain;

/// <summary>
/// Dinheiro emprestado não é receita: fica fora das entradas e mexe só no saldo. A parcela paga é gasto comum,
/// porque o extrato não separa os juros do valor devolvido.
/// </summary>
public static class Emprestimo
{
    public const string Categoria = "Empréstimos";

    private static readonly string[] Termos =
    [
        "EMPRESTIMO", "EMPRESTIMOS", "CONSIGNADO", "CREDITO PESSOAL", "LIBERACAO DE CREDITO", "CONTRATACAO DE CREDITO",
        "SAQUE ANIVERSARIO", "ANTECIPACAO FGTS", "ANTECIPACAO DE FGTS", "ANTECIPACAO DO FGTS", "ANTECIPACAO SAQUE FGTS",
    ];

    internal static bool NaDescricao(string descricao) => TextoNormalizado.ContemAlgum(descricao, Termos);
}

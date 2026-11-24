namespace HdsFinance.Domain;

/// <summary>
/// Dinheiro passado entre as contas do Inter e do Nubank não é gasto nem receita. Exige valor oposto, data próxima
/// e um dos lados citando o outro banco, para não casar dois Pix que só coincidem.
/// </summary>
public static class TransferenciasEntreBancos
{
    private const int DiasDeFolga = 1;
    private static readonly string[] TermosDoInter = ["BANCO INTER"];
    private static readonly string[] TermosDoNubank = ["NU PAGAMENTOS", "NUBANK", "18236120"];

    public static IReadOnlyList<Transacao> Aplicar(IEnumerable<Transacao> transacoes)
    {
        var todas = transacoes.ToList();
        var livres = Enumerable.Range(0, todas.Count)
            .Where(i => todas[i].Banco == Banco.Inter && todas[i].Tipo == TipoDeTransacao.Comum)
            .ToHashSet();
        var proprias = new HashSet<int>();

        for (var i = 0; i < todas.Count; i++)
        {
            var nubank = todas[i];
            if (nubank.Banco != Banco.Nubank || nubank.Tipo != TipoDeTransacao.Comum)
            {
                continue;
            }

            var par = livres
                .Where(j => todas[j].Valor == -nubank.Valor
                    && Dias(todas[j], nubank) <= DiasDeFolga
                    && (TextoNormalizado.ContemAlgum(nubank.Descricao, TermosDoInter) || TextoNormalizado.ContemAlgum(todas[j].Descricao, TermosDoNubank)))
                .OrderBy(j => Dias(todas[j], nubank))
                .Select(j => (int?)j)
                .FirstOrDefault();
            if (par is { } inter)
            {
                livres.Remove(inter);
                proprias.UnionWith([i, inter]);
            }
        }

        return todas.Select((t, i) => proprias.Contains(i) ? t with { Tipo = TipoDeTransacao.TransferenciaEntreContasProprias } : t).ToList();
    }

    private static int Dias(Transacao a, Transacao b) => Math.Abs(a.Data.DayNumber - b.Data.DayNumber);
}

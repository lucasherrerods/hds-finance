namespace HdsFinance.Domain;

/// <summary>
/// Separa aplicações, resgates e transferências entre contas próprias, que não são receita nem despesa.
/// Os termos são comparados como palavras inteiras, sem acento e sem diferenciar maiúsculas.
/// </summary>
public sealed class ClassificadorDeTipo
{
    private static readonly string[] TermosDeInvestimento =
        ["APLICACAO", "RESGATE", "CDB", "LCI", "LCA", "TESOURO", "INVESTIMENTO", "POUPANCA", "DEBITO B3"];

    private static readonly string[] TermosDeTransferenciaPropriaPadrao =
        ["TRANSFERENCIA ENTRE CONTAS", "MESMA TITULARIDADE"];

    private readonly string[] _transferenciaPropria;

    public ClassificadorDeTipo(IEnumerable<string>? termosDeTransferenciaPropria = null)
    {
        _transferenciaPropria = TermosDeTransferenciaPropriaPadrao
            .Concat((termosDeTransferenciaPropria ?? []).Select(TextoNormalizado.De))
            .Where(t => t.Length > 0)
            .ToArray();
    }

    public Transacao Classificar(Transacao transacao)
    {
        var tipo = TextoNormalizado.ContemAlgum(transacao.Descricao, _transferenciaPropria) ? TipoDeTransacao.TransferenciaEntreContasProprias
            : TextoNormalizado.ContemAlgum(transacao.Descricao, TermosDeInvestimento) ? TipoDeTransacao.MovimentacaoDeInvestimento
            : TipoDeTransacao.Comum;

        return transacao with { Tipo = tipo };
    }
}

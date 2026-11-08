namespace HdsFinance.Dominio;

public enum TipoDeTransacao
{
    Comum,
    TransferenciaEntreContasProprias,
    MovimentacaoDeInvestimento,
}

/// <summary>Valor positivo é entrada, negativo é saída.</summary>
public sealed record Transacao(DateOnly Data, decimal Valor, string Descricao, TipoDeTransacao Tipo)
{
    public bool ContaNoFluxoDeCaixa => Tipo == TipoDeTransacao.Comum;
}

using FluentAssertions;

namespace HdsFinance.Domain.Tests;

public class ClassificadorDeTipoTestes
{
    private static Transacao Com(string descricao) =>
        new(new DateOnly(2026, 10, 1), -100m, descricao, TipoDeTransacao.Comum);

    private readonly ClassificadorDeTipo _padrao = new();

    [Theory]
    [InlineData("Aplicação CDB Ficticio")]
    [InlineData("RESGATE LCI")]
    [InlineData("Compra Tesouro Direto")]
    [InlineData("Investimento poupanca")]
    [InlineData("Débito B3 Corretora Ficticia")]
    [InlineData("DEBITO B3")]
    public void Aplicacoes_e_resgates_sao_movimentacao_de_investimento(string descricao)
    {
        _padrao.Classificar(Com(descricao)).Tipo.Should().Be(TipoDeTransacao.MovimentacaoDeInvestimento);
    }

    [Theory]
    [InlineData("Transferência entre contas")]
    [InlineData("Pix enviado mesma titularidade")]
    public void Transferencias_entre_contas_proprias_sao_reconhecidas(string descricao)
    {
        _padrao.Classificar(Com(descricao)).Tipo.Should().Be(TipoDeTransacao.TransferenciaEntreContasProprias);
    }

    [Theory]
    [InlineData("Compra no debito Mercado Exemplo")]
    [InlineData("Pix recebido Fulano de Tal")]
    [InlineData("Restaurante Cdbar")]
    [InlineData("Compra no debito Loja B3 Games")]
    public void O_resto_continua_comum(string descricao)
    {
        _padrao.Classificar(Com(descricao)).Tipo.Should().Be(TipoDeTransacao.Comum);
    }

    [Fact]
    public void Termos_extras_de_transferencia_propria_vem_da_configuracao()
    {
        var classificador = new ClassificadorDeTipo(termosDeTransferenciaPropria: ["Fulano Ficticio"]);

        classificador.Classificar(Com("Pix enviado FULANO FICTÍCIO")).Tipo
            .Should().Be(TipoDeTransacao.TransferenciaEntreContasProprias);
    }

    [Fact]
    public void Preserva_os_demais_dados_da_transacao()
    {
        var original = Com("Resgate CDB") with { IdExterno = "X" };

        _padrao.Classificar(original).Should().Be(original with { Tipo = TipoDeTransacao.MovimentacaoDeInvestimento });
    }
}

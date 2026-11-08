using FluentAssertions;
using HdsFinance.Application.Extratos;

namespace HdsFinance.Application.Tests.Extratos;

public class FormatosDeExtratoTestes
{
    [Theory]
    [InlineData("extrato.ofx", FormatoDeExtrato.Ofx)]
    [InlineData("C:/pasta/EXTRATO.OFX", FormatoDeExtrato.Ofx)]
    [InlineData("extrato.csv", FormatoDeExtrato.Csv)]
    public void Reconhece_o_formato_pela_extensao(string nome, FormatoDeExtrato esperado)
    {
        FormatosDeExtrato.PeloNomeDoArquivo(nome).Should().Be(esperado);
    }

    [Theory]
    [InlineData("extrato.pdf")]
    [InlineData("extrato")]
    public void Extensao_desconhecida_nao_tem_formato(string nome)
    {
        FormatosDeExtrato.PeloNomeDoArquivo(nome).Should().BeNull();
    }
}

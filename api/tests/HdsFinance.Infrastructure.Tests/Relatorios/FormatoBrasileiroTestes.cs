using FluentAssertions;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Relatorios;

namespace HdsFinance.Infrastructure.Tests.Relatorios;

public class FormatoBrasileiroTestes
{
    [Theory]
    [InlineData(1234.56, "R$ 1.234,56")]
    [InlineData(-50, "-R$ 50,00")]
    [InlineData(0, "R$ 0,00")]
    public void Formata_moeda_em_real(decimal valor, string esperado)
    {
        FormatoBrasileiro.Moeda(valor).Should().Be(esperado);
    }

    [Fact]
    public void Saldo_sem_valor_aparece_como_nao_informado()
    {
        FormatoBrasileiro.Moeda(null).Should().Be("não informado");
    }

    [Fact]
    public void Formata_data_com_dia_mes_e_ano()
    {
        FormatoBrasileiro.Data(new DateOnly(2026, 3, 7)).Should().Be("07/03/2026");
    }

    [Fact]
    public void Escreve_o_mes_por_extenso()
    {
        FormatoBrasileiro.Mes(new MesDeReferencia(2026, 10)).Should().Be("outubro de 2026");
        FormatoBrasileiro.MesCurto(new MesDeReferencia(2026, 10)).Should().Be("out/26");
    }
}

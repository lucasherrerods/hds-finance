using FluentAssertions;
using HdsFinance.Domain;

namespace HdsFinance.Domain.Tests;

public class MesDeReferenciaTestes
{
    [Theory]
    [InlineData(2026, 2, 28)]
    [InlineData(2028, 2, 29)]
    [InlineData(2026, 10, 31)]
    public void Sabe_o_ultimo_dia(int ano, int mes, int dia)
    {
        new MesDeReferencia(ano, mes).UltimoDia.Should().Be(new DateOnly(ano, mes, dia));
    }

    [Fact]
    public void Esta_completo_quando_o_extrato_cobre_ate_o_ultimo_dia()
    {
        var outubro = new MesDeReferencia(2026, 10);

        outubro.EstaCompleto(new DateOnly(2026, 10, 31)).Should().BeTrue();
        outubro.EstaCompleto(new DateOnly(2026, 11, 3)).Should().BeTrue();
        outubro.EstaCompleto(new DateOnly(2026, 10, 30)).Should().BeFalse();
        outubro.EstaCompleto(null).Should().BeFalse();
    }

    [Fact]
    public void O_ultimo_mes_completo_e_o_da_cobertura_quando_ela_chega_ao_fim_do_mes()
    {
        MesDeReferencia.UltimoCompleto(new DateOnly(2026, 10, 31)).Should().Be(new MesDeReferencia(2026, 10));
    }

    [Fact]
    public void Com_o_mes_pela_metade_o_ultimo_completo_e_o_anterior()
    {
        MesDeReferencia.UltimoCompleto(new DateOnly(2026, 11, 12)).Should().Be(new MesDeReferencia(2026, 10));
        MesDeReferencia.UltimoCompleto(new DateOnly(2026, 1, 5)).Should().Be(new MesDeReferencia(2025, 12));
    }

    [Fact]
    public void Sem_cobertura_nao_ha_mes_completo()
    {
        MesDeReferencia.UltimoCompleto(null).Should().BeNull();
    }

    [Fact]
    public void Le_e_escreve_no_formato_ano_mes()
    {
        MesDeReferencia.TentarLer("2026-03").Should().Be(new MesDeReferencia(2026, 3));
        MesDeReferencia.TentarLer("março").Should().BeNull();
        new MesDeReferencia(2026, 3).ToString().Should().Be("2026-03");
    }
}

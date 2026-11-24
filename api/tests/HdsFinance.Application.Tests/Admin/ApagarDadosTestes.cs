using FluentAssertions;
using HdsFinance.Application.Admin;
using HdsFinance.Application.Extratos;
using HdsFinance.Domain;
using NSubstitute;

namespace HdsFinance.Application.Tests.Admin;

public class ApagarDadosTestes
{
    private readonly IRepositorioDeTransacoes _repositorio = Substitute.For<IRepositorioDeTransacoes>();
    private static readonly DateOnly Dia = new(2026, 10, 5);

    [Fact]
    public async Task Apaga_a_transacao_encontrada()
    {
        _repositorio.RemoverAsync(Dia, -123.45m, "Mercado").Returns(true);

        var resultado = await new ApagarDados(_repositorio).TransacaoAsync(Dia, -123.45m, "Mercado");

        resultado.Should().BeOfType<ResultadoDaRemocao.Apagado>().Which.Quantidade.Should().Be(1);
    }

    [Fact]
    public async Task Transacao_que_nao_existe_vira_nao_encontrada()
    {
        var resultado = await new ApagarDados(_repositorio).TransacaoAsync(Dia, -1m, "Nada");

        resultado.Should().BeOfType<ResultadoDaRemocao.NaoEncontrado>();
    }

    [Fact]
    public async Task Apaga_o_mes_inteiro()
    {
        var outubro = new MesDeReferencia(2026, 10);
        _repositorio.RemoverMesAsync(outubro).Returns(7);

        var resultado = await new ApagarDados(_repositorio).MesAsync(outubro);

        resultado.Should().BeOfType<ResultadoDaRemocao.Apagado>().Which.Quantidade.Should().Be(7);
    }

    [Fact]
    public async Task Mes_sem_transacoes_vira_nao_encontrado()
    {
        var resultado = await new ApagarDados(_repositorio).MesAsync(new MesDeReferencia(2026, 1));

        resultado.Should().BeOfType<ResultadoDaRemocao.NaoEncontrado>();
    }
}

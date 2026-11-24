using FluentAssertions;
using HdsFinance.Application.Admin;
using HdsFinance.Application.Extratos;
using HdsFinance.Domain;
using NSubstitute;

namespace HdsFinance.Application.Tests.Admin;

public class AjustarTransacaoTestes
{
    private readonly IRepositorioDeTransacoes _repositorio = Substitute.For<IRepositorioDeTransacoes>();

    public AjustarTransacaoTestes()
    {
        _repositorio.DefinirCategoriaAsync("F1", Arg.Any<string?>(), Arg.Any<CancellationToken>()).Returns(true);
        _repositorio.DefinirOcultaAsync("F1", Arg.Any<bool>(), Arg.Any<CancellationToken>()).Returns(true);
    }

    private AjustarTransacao Ajustar() => new(_repositorio, new Categorizador([new RegraDeCategoria("Moradia", ["aluguel"])]));

    [Fact]
    public async Task Guarda_a_categoria_so_dessa_transacao()
    {
        (await Ajustar().CategoriaAsync("F1", "Moradia")).Should().BeOfType<ResultadoDoAjuste.Ajustada>();

        await _repositorio.Received(1).DefinirCategoriaAsync("F1", "Moradia", Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(null)]
    [InlineData(TransacaoCategorizada.CategoriaDeEntrada)]
    public async Task Sem_categoria_propria_volta_a_valer_a_automatica(string? categoria)
    {
        await Ajustar().CategoriaAsync("F1", categoria);

        await _repositorio.Received(1).DefinirCategoriaAsync("F1", null, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Categoria_que_nao_existe_e_recusada()
    {
        (await Ajustar().CategoriaAsync("F1", "Inventada")).Should().BeOfType<ResultadoDoAjuste.CategoriaInvalida>();
        await _repositorio.DidNotReceiveWithAnyArgs().DefinirCategoriaAsync(default!, default);
    }

    [Fact]
    public async Task Oculta_e_mostra_de_novo()
    {
        (await Ajustar().OcultarAsync("F1", true)).Should().BeOfType<ResultadoDoAjuste.Ajustada>();

        await _repositorio.Received(1).DefinirOcultaAsync("F1", true, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Transacao_que_nao_existe_vira_nao_encontrada()
    {
        (await Ajustar().CategoriaAsync("X", "Moradia")).Should().BeOfType<ResultadoDoAjuste.NaoEncontrada>();
        (await Ajustar().OcultarAsync("X", true)).Should().BeOfType<ResultadoDoAjuste.NaoEncontrada>();
    }
}

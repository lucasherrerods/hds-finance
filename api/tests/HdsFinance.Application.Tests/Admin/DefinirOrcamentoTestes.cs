using FluentAssertions;
using HdsFinance.Application.Admin;

namespace HdsFinance.Application.Tests.Admin;

public class DefinirOrcamentoTestes
{
    private readonly OrcamentosFalsos _orcamentos = new();

    private DefinirOrcamento CasoDeUso => new(_orcamentos);

    [Fact]
    public async Task Guarda_o_limite_do_grupo()
    {
        (await CasoDeUso.ExecutarAsync("Lazer", 300m)).Should().Be(ResultadoDoOrcamento.Definido);

        (await _orcamentos.ListarAsync()).Should().Contain("Lazer", 300m);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(0)]
    public async Task Sem_limite_ou_zero_tira_o_limite(int? limite)
    {
        await _orcamentos.DefinirAsync("Lazer", 300m);

        await CasoDeUso.ExecutarAsync("Lazer", limite);

        (await _orcamentos.ListarAsync()).Should().BeEmpty();
    }

    [Theory]
    [InlineData("Grupo inventado", 100)]
    [InlineData("Lazer", -5)]
    public async Task Recusa_grupo_desconhecido_e_limite_negativo(string grupo, int limite)
    {
        (await CasoDeUso.ExecutarAsync(grupo, limite)).Should().Be(ResultadoDoOrcamento.Invalido);

        (await _orcamentos.ListarAsync()).Should().BeEmpty();
    }
}

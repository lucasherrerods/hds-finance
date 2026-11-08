using FluentAssertions;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Repositorios;

namespace HdsFinance.Infrastructure.Tests.Repositorios;

public class RepositorioEmMemoriaTestes
{
    private static readonly Transacao Salario = new(new DateOnly(2026, 10, 1), 3500m, "Salario", TipoDeTransacao.Comum, "A");
    private static readonly Transacao Mercado = new(new DateOnly(2026, 10, 5), -100m, "Mercado", TipoDeTransacao.Comum, "B");

    [Fact]
    public async Task Lista_o_que_foi_adicionado()
    {
        var repositorio = new RepositorioEmMemoria();

        await repositorio.AdicionarAsync([Salario, Mercado]);

        (await repositorio.ListarAsync()).Should().Equal(Salario, Mercado);
    }

    [Fact]
    public async Task Informa_so_as_chaves_que_ja_existem()
    {
        var repositorio = new RepositorioEmMemoria();
        await repositorio.AdicionarAsync([Salario]);

        var existentes = await repositorio.ChavesExistentesAsync(["A", "B"]);

        existentes.Should().BeEquivalentTo(["A"]);
    }
}

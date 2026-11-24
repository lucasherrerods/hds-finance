using FluentAssertions;
using HdsFinance.Application.Admin;
using HdsFinance.Application.Extratos;
using HdsFinance.Domain;
using NSubstitute;

namespace HdsFinance.Application.Tests.Admin;

public class ImportarFaturaTestes
{
    private readonly IRepositorioDeTransacoes _repositorio = Substitute.For<IRepositorioDeTransacoes>();
    private static readonly Fatura Exemplo = new(new DateOnly(2026, 11, 2), 10m, 0m, 0m, 10m,
        [new CartaoDaFatura(10m, [new LinhaDaFatura(new DateOnly(2026, 10, 5), "LANCHE", -10m)])]);

    private Task<ResultadoDaFatura> Importar(ResultadoDaLeituraDeFatura leitura, IReadOnlySet<string>? existentes = null)
    {
        var leitor = Substitute.For<ILeitorDeFatura>();
        leitor.Ler(Arg.Any<byte[]>(), "fatura.pdf", "senha").Returns(leitura);
        _repositorio.ChavesExistentesAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>()).Returns(existentes ?? new HashSet<string>());
        return new ImportarFatura(leitor, _repositorio).ExecutarAsync([1], "fatura.pdf", "senha");
    }

    [Fact]
    public async Task Guarda_as_compras_e_conta_so_elas()
    {
        (await Importar(new ResultadoDaLeituraDeFatura.Lida(Exemplo))).Should().Be(new ResultadoDaFatura.Importada(1, 0));

        await _repositorio.Received(1).AdicionarAsync(Arg.Is<IReadOnlyCollection<Transacao>>(t => t.Count == 2), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Repetir_a_fatura_nao_grava_de_novo()
    {
        var chaves = Exemplo.ParaTransacoes().Select(t => t.ChaveDeDeduplicacao).ToHashSet();

        (await Importar(new ResultadoDaLeituraDeFatura.Lida(Exemplo), chaves)).Should().Be(new ResultadoDaFatura.Importada(0, 1));
        await _repositorio.DidNotReceiveWithAnyArgs().AdicionarAsync(default!);
    }

    [Fact]
    public async Task Fatura_que_nao_fecha_nao_grava_nada()
    {
        (await Importar(new ResultadoDaLeituraDeFatura.Lida(Exemplo with { Despesas = 11m }))).Should().BeOfType<ResultadoDaFatura.Invalida>();
        await _repositorio.DidNotReceiveWithAnyArgs().AdicionarAsync(default!);
    }

    [Fact]
    public async Task Senha_e_arquivo_invalido_viram_resultados_tipados()
    {
        (await Importar(new ResultadoDaLeituraDeFatura.SenhaNecessaria())).Should().BeOfType<ResultadoDaFatura.SenhaNecessaria>();
        (await Importar(new ResultadoDaLeituraDeFatura.Invalida("motivo"))).Should().Be(new ResultadoDaFatura.Invalida("motivo"));
    }
}

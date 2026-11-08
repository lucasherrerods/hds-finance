using FluentAssertions;
using HdsFinance.Application.Extratos;
using HdsFinance.Domain;
using NSubstitute;

namespace HdsFinance.Application.Tests.Extratos;

public class ResumirExtratoTestes
{
    private static ResumirExtrato CasoDeUsoQueLe(ResultadoDaLeitura leitura, IRepositorioDeTransacoes repositorio)
    {
        var leitor = Substitute.For<ILeitorDeExtrato>();
        leitor.Formato.Returns(FormatoDeExtrato.Csv);
        leitor.LerAsync(Arg.Any<Stream>(), Arg.Any<CancellationToken>()).Returns(leitura);
        return new ResumirExtrato(new ImportarExtrato([leitor], repositorio), repositorio);
    }

    [Fact]
    public async Task Devolve_a_importacao_e_o_resumo_de_cada_mes()
    {
        var repositorio = Substitute.For<IRepositorioDeTransacoes>();
        repositorio.ChavesExistentesAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>()).Returns(new HashSet<string>());
        var salario = new Transacao(new DateOnly(2026, 10, 1), 3500m, "Salario", TipoDeTransacao.Comum);
        repositorio.ListarAsync(Arg.Any<CancellationToken>()).Returns([salario]);

        var resultado = await CasoDeUsoQueLe(new ResultadoDaLeitura.Sucesso([salario]), repositorio)
            .ExecutarAsync(Stream.Null, FormatoDeExtrato.Csv);

        var resumido = resultado.Should().BeOfType<ResultadoDoResumo.Resumido>().Subject;
        resumido.Importacao.Should().Be(new ResultadoDaImportacao.Importado(1, 0));
        resumido.Meses.Should().ContainSingle().Which.Entradas.Should().Be(3500m);
    }

    [Fact]
    public async Task Arquivo_invalido_nao_gera_resumo()
    {
        var repositorio = Substitute.For<IRepositorioDeTransacoes>();

        var resultado = await CasoDeUsoQueLe(new ResultadoDaLeitura.Falha(3, "Data da transação inválida."), repositorio)
            .ExecutarAsync(Stream.Null, FormatoDeExtrato.Csv);

        resultado.Should().Be(new ResultadoDoResumo.NaoImportado(new ResultadoDaImportacao.ArquivoInvalido(3, "Data da transação inválida.")));
    }
}

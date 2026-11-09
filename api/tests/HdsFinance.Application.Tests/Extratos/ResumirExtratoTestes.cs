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

public class ResumirExtratoSaldoTestes
{
    [Fact]
    public async Task Usa_o_saldo_final_do_extrato_para_calcular_o_saldo_de_cada_mes()
    {
        var salario = new Transacao(new DateOnly(2026, 10, 1), 3500m, "Salario", TipoDeTransacao.Comum);
        var leitor = Substitute.For<ILeitorDeExtrato>();
        leitor.Formato.Returns(FormatoDeExtrato.Csv);
        leitor.LerAsync(Arg.Any<Stream>(), Arg.Any<CancellationToken>())
            .Returns(new ResultadoDaLeitura.Sucesso([salario], SaldoFinal: 4000m));
        var repositorio = Substitute.For<IRepositorioDeTransacoes>();
        repositorio.ChavesExistentesAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>()).Returns(new HashSet<string>());
        repositorio.ListarAsync(Arg.Any<CancellationToken>()).Returns([salario]);

        var resultado = await new ResumirExtrato(new ImportarExtrato([leitor], repositorio), repositorio)
            .ExecutarAsync(Stream.Null, FormatoDeExtrato.Csv);

        var mes = ((ResultadoDoResumo.Resumido)resultado).Meses.Single();
        mes.SaldoInicial.Should().Be(500m);
        mes.SaldoFinal.Should().Be(4000m);
    }
}

public class ResumirExtratoCategoriasTestes
{
    [Fact]
    public async Task Usa_o_categorizador_recebido()
    {
        var gasto = new Transacao(new DateOnly(2026, 10, 1), -80m, "Livraria Central", TipoDeTransacao.Comum);
        var leitor = Substitute.For<ILeitorDeExtrato>();
        leitor.Formato.Returns(FormatoDeExtrato.Csv);
        leitor.LerAsync(Arg.Any<Stream>(), Arg.Any<CancellationToken>()).Returns(new ResultadoDaLeitura.Sucesso([gasto]));
        var repositorio = Substitute.For<IRepositorioDeTransacoes>();
        repositorio.ChavesExistentesAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>()).Returns(new HashSet<string>());
        repositorio.ListarAsync(Arg.Any<CancellationToken>()).Returns([gasto]);
        var categorizador = new Categorizador([new RegraDeCategoria("Educação", ["livraria"])]);

        var resultado = await new ResumirExtrato(new ImportarExtrato([leitor], repositorio), repositorio, categorizador)
            .ExecutarAsync(Stream.Null, FormatoDeExtrato.Csv);

        ((ResultadoDoResumo.Resumido)resultado).Meses.Single().GastosPorCategoria
            .Should().Equal(new GastoPorCategoria("Educação", 80m));
    }
}

public class ResumirExtratoPainelTestes
{
    [Fact]
    public async Task Devolve_o_painel_do_ultimo_mes()
    {
        var gasto = new Transacao(new DateOnly(2026, 11, 3), -80m, "Mercado", TipoDeTransacao.Comum);
        var leitor = Substitute.For<ILeitorDeExtrato>();
        leitor.Formato.Returns(FormatoDeExtrato.Csv);
        leitor.LerAsync(Arg.Any<Stream>(), Arg.Any<CancellationToken>()).Returns(new ResultadoDaLeitura.Sucesso([gasto]));
        var repositorio = Substitute.For<IRepositorioDeTransacoes>();
        repositorio.ChavesExistentesAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>()).Returns(new HashSet<string>());
        repositorio.ListarAsync(Arg.Any<CancellationToken>()).Returns([gasto]);

        var resultado = await new ResumirExtrato(new ImportarExtrato([leitor], repositorio), repositorio)
            .ExecutarAsync(Stream.Null, FormatoDeExtrato.Csv);

        var painel = ((ResultadoDoResumo.Resumido)resultado).Painel;
        painel!.Mes.Should().Be(new MesDeReferencia(2026, 11));
        painel.GastoNoMes.Should().Be(80m);
    }
}

public class ResumirExtratoTransacoesTestes
{
    [Fact]
    public async Task Devolve_todas_as_transacoes_categorizadas()
    {
        var outubro = new Transacao(new DateOnly(2026, 10, 3), -80m, "Mercado", TipoDeTransacao.Comum);
        var novembro = new Transacao(new DateOnly(2026, 11, 3), 500m, "Pix recebido", TipoDeTransacao.Comum);
        var leitor = Substitute.For<ILeitorDeExtrato>();
        leitor.Formato.Returns(FormatoDeExtrato.Csv);
        leitor.LerAsync(Arg.Any<Stream>(), Arg.Any<CancellationToken>()).Returns(new ResultadoDaLeitura.Sucesso([outubro, novembro]));
        var repositorio = Substitute.For<IRepositorioDeTransacoes>();
        repositorio.ChavesExistentesAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>()).Returns(new HashSet<string>());
        repositorio.ListarAsync(Arg.Any<CancellationToken>()).Returns([outubro, novembro]);

        var resultado = await new ResumirExtrato(new ImportarExtrato([leitor], repositorio), repositorio)
            .ExecutarAsync(Stream.Null, FormatoDeExtrato.Csv);

        ((ResultadoDoResumo.Resumido)resultado).Transacoes.Select(t => (t.Data.Month, t.Categoria)).Should().Equal(
            (11, TransacaoCategorizada.CategoriaDeEntrada),
            (10, "Alimentação"));
    }
}

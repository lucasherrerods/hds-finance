using FluentAssertions;
using HdsFinance.Application.Extratos;
using HdsFinance.Domain;
using NSubstitute;

namespace HdsFinance.Application.Tests.Extratos;

public class ImportarExtratoTestes
{
    private static readonly Transacao Salario = new(new DateOnly(2026, 10, 1), 3500m, "Salario", TipoDeTransacao.Comum, "A");
    private static readonly Transacao Mercado = new(new DateOnly(2026, 10, 5), -100m, "Mercado", TipoDeTransacao.Comum, "B");

    private readonly RepositorioFake _repositorio = new();

    private ImportarExtrato CasoDeUsoQueLe(ResultadoDaLeitura resultado)
    {
        var leitor = Substitute.For<ILeitorDeExtrato>();
        leitor.Formato.Returns(FormatoDeExtrato.Ofx);
        leitor.LerAsync(Arg.Any<Stream>(), Arg.Any<CancellationToken>()).Returns(resultado);
        return new ImportarExtrato([leitor], _repositorio);
    }

    [Fact]
    public async Task Grava_as_transacoes_lidas()
    {
        var casoDeUso = CasoDeUsoQueLe(new ResultadoDaLeitura.Sucesso([Salario, Mercado]));

        var resultado = await casoDeUso.ExecutarAsync(Stream.Null, FormatoDeExtrato.Ofx);

        resultado.Should().Be(new ResultadoDaImportacao.Importado(Novas: 2, Duplicadas: 0));
        _repositorio.Gravadas.Should().Equal(Salario, Mercado);
    }

    [Fact]
    public async Task Importar_o_mesmo_extrato_duas_vezes_nao_duplica()
    {
        var casoDeUso = CasoDeUsoQueLe(new ResultadoDaLeitura.Sucesso([Salario, Mercado]));

        await casoDeUso.ExecutarAsync(Stream.Null, FormatoDeExtrato.Ofx);
        var segunda = await casoDeUso.ExecutarAsync(Stream.Null, FormatoDeExtrato.Ofx);

        segunda.Should().Be(new ResultadoDaImportacao.Importado(Novas: 0, Duplicadas: 2));
        _repositorio.Gravadas.Should().HaveCount(2);
    }

    [Fact]
    public async Task Transacao_repetida_dentro_do_mesmo_arquivo_entra_uma_vez()
    {
        var casoDeUso = CasoDeUsoQueLe(new ResultadoDaLeitura.Sucesso([Salario, Salario]));

        var resultado = await casoDeUso.ExecutarAsync(Stream.Null, FormatoDeExtrato.Ofx);

        resultado.Should().Be(new ResultadoDaImportacao.Importado(Novas: 1, Duplicadas: 1));
    }

    [Fact]
    public async Task Arquivo_invalido_nao_grava_nada()
    {
        var casoDeUso = CasoDeUsoQueLe(new ResultadoDaLeitura.Falha(7, "Valor da transação inválido."));

        var resultado = await casoDeUso.ExecutarAsync(Stream.Null, FormatoDeExtrato.Ofx);

        resultado.Should().Be(new ResultadoDaImportacao.ArquivoInvalido(7, "Valor da transação inválido."));
        _repositorio.Gravadas.Should().BeEmpty();
    }

    [Fact]
    public async Task Formato_sem_leitor_e_recusado()
    {
        var casoDeUso = CasoDeUsoQueLe(new ResultadoDaLeitura.Sucesso([Salario]));

        var resultado = await casoDeUso.ExecutarAsync(Stream.Null, FormatoDeExtrato.Csv);

        resultado.Should().BeOfType<ResultadoDaImportacao.FormatoNaoSuportado>();
    }

    private sealed class RepositorioFake : IRepositorioDeTransacoes
    {
        public List<Transacao> Gravadas { get; } = [];

        public Task<IReadOnlySet<string>> ChavesExistentesAsync(IEnumerable<string> chaves, CancellationToken cancelamento = default) =>
            Task.FromResult<IReadOnlySet<string>>(Gravadas.Select(t => t.ChaveDeDeduplicacao).Intersect(chaves).ToHashSet());

        public Task AdicionarAsync(IReadOnlyCollection<Transacao> transacoes, CancellationToken cancelamento = default)
        {
            Gravadas.AddRange(transacoes);
            return Task.CompletedTask;
        }
    }
}

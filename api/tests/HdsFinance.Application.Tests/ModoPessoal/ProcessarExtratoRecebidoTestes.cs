using FluentAssertions;
using HdsFinance.Application.Extratos;
using HdsFinance.Application.ModoPessoal;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;

namespace HdsFinance.Application.Tests.ModoPessoal;

public class ProcessarExtratoRecebidoTestes
{
    private readonly RegistroFalso _registro = new();
    private readonly INotificador _notificador = Substitute.For<INotificador>();

    private ProcessarExtratoRecebido Montar(ResultadoDaLeitura leitura)
    {
        var leitor = Substitute.For<ILeitorDeExtrato>();
        leitor.Formato.Returns(FormatoDeExtrato.Ofx);
        leitor.LerAsync(Arg.Any<Stream>(), Arg.Any<CancellationToken>()).Returns(leitura);

        var transacoes = Substitute.For<IRepositorioDeTransacoes>();
        transacoes.ChavesExistentesAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>()).Returns(new HashSet<string>());
        transacoes.ListarAsync(Arg.Any<CancellationToken>())
            .Returns(leitura is ResultadoDaLeitura.Sucesso s ? s.Transacoes : []);

        _notificador.EnviarAsync(Arg.Any<MesDeReferencia>(), Arg.Any<byte[]>(), Arg.Any<CancellationToken>())
            .Returns(new ResultadoDoEnvio.Enviado());
        var gerador = Substitute.For<IGeradorDeRelatorio>();
        gerador.Gerar(Arg.Any<Relatorio>()).Returns([1]);
        var tempo = new FakeTimeProvider();
        var fechar = new FecharMes(transacoes, _registro, new GerarRelatorio(gerador, tempo), _notificador, tempo);

        return new ProcessarExtratoRecebido(new ImportarExtrato([leitor], transacoes), _registro, fechar);
    }

    private static readonly Transacao Salario = new(new DateOnly(2026, 10, 1), 3500m, "Salario", TipoDeTransacao.Comum, "F1");

    [Fact]
    public async Task Importa_registra_a_cobertura_e_envia_o_mes_que_ficou_completo()
    {
        var processar = Montar(new ResultadoDaLeitura.Sucesso([Salario], 3500m, new DateOnly(2026, 10, 31)));

        var resultado = await processar.ExecutarAsync(Stream.Null, FormatoDeExtrato.Ofx);

        resultado.Importacao.Should().BeOfType<ResultadoDaImportacao.Importado>();
        resultado.Fechamento.Should().Be(new ResultadoDoFechamento.Enviado(new MesDeReferencia(2026, 10)));
        _registro.Extratos.Should().ContainSingle().Which.Should().Be((new DateOnly(2026, 10, 31), 3500m));
    }

    [Fact]
    public async Task Arquivo_invalido_nao_registra_nem_envia()
    {
        var processar = Montar(new ResultadoDaLeitura.Falha(2, "Data inválida."));

        var resultado = await processar.ExecutarAsync(Stream.Null, FormatoDeExtrato.Ofx);

        resultado.Importacao.Should().BeOfType<ResultadoDaImportacao.ArquivoInvalido>();
        resultado.Fechamento.Should().BeNull();
        _registro.Extratos.Should().BeEmpty();
    }
}

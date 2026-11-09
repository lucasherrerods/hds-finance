using FluentAssertions;
using HdsFinance.Application.EmailDaDemo;
using HdsFinance.Application.Extratos;
using HdsFinance.Application.ModoPessoal;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;

namespace HdsFinance.Application.Tests.EmailDaDemo;

public class EnviarRelatorioDaDemoTestes
{
    private const string Email = "pessoa@exemplo.com";

    private readonly EnvioFalso _envio = new();
    private readonly LimiteFalso _limite = new();
    private readonly ConfirmacaoDeEmail _confirmacao;
    private readonly EnviarRelatorioDaDemo _enviar;

    public EnviarRelatorioDaDemoTestes()
    {
        var tempo = new FakeTimeProvider(new DateTimeOffset(2026, 11, 9, 12, 0, 0, TimeSpan.Zero));
        _confirmacao = new ConfirmacaoDeEmail(_envio, new AssinadorFalso(), new CodigoFixo("123456"), _limite, tempo);

        var transacoes = new List<Transacao> { new(new DateOnly(2026, 10, 1), 3500m, "Salario", TipoDeTransacao.Comum) };
        var leitor = Substitute.For<ILeitorDeExtrato>();
        leitor.Formato.Returns(FormatoDeExtrato.Ofx);
        leitor.LerAsync(Arg.Any<Stream>(), Arg.Any<CancellationToken>()).Returns(new ResultadoDaLeitura.Sucesso(transacoes));
        var repositorio = Substitute.For<IRepositorioDeTransacoes>();
        repositorio.ChavesExistentesAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>()).Returns(new HashSet<string>());
        repositorio.ListarAsync(Arg.Any<CancellationToken>()).Returns(transacoes);
        var gerador = Substitute.For<IGeradorDeRelatorio>();
        gerador.Gerar(Arg.Any<Relatorio>()).Returns([9, 9]);

        _enviar = new EnviarRelatorioDaDemo(
            new ResumirExtrato(new ImportarExtrato([leitor], repositorio), repositorio),
            new GerarRelatorio(gerador, tempo),
            _confirmacao,
            _envio,
            _limite);
    }

    private async Task<string> TokenConfirmado()
    {
        var desafio = ((ResultadoDoPedidoDeCodigo.CodigoEnviado)await _confirmacao.PedirCodigoAsync(Email)).Desafio;
        _envio.Enviados.Clear();
        return ((ResultadoDaConfirmacao.Confirmado)_confirmacao.Confirmar(Email, "123456", desafio)).Token;
    }

    [Fact]
    public async Task Com_email_confirmado_envia_so_o_pdf_do_mes()
    {
        var token = await TokenConfirmado();

        var resultado = await _enviar.ExecutarAsync(Stream.Null, FormatoDeExtrato.Ofx, Email, token);

        resultado.Should().Be(new ResultadoDoEnvioDaDemo.Enviado(new MesDeReferencia(2026, 10)));
        var email = _envio.Enviados.Should().ContainSingle().Subject;
        email.Para.Should().Be(Email);
        email.Anexo!.Nome.Should().Be("fechamento-2026-10.pdf");
        email.Anexo.Conteudo.Should().Equal(9, 9);
    }

    [Fact]
    public async Task Sem_confirmacao_nao_envia()
    {
        var resultado = await _enviar.ExecutarAsync(Stream.Null, FormatoDeExtrato.Ofx, Email, "token-falso");

        resultado.Should().Be(new ResultadoDoEnvioDaDemo.NaoConfirmado());
        _envio.Enviados.Should().BeEmpty();
    }

    [Fact]
    public async Task Respeita_o_limite_de_envios_por_email()
    {
        var token = await TokenConfirmado();
        _limite.Liberado = false;

        var resultado = await _enviar.ExecutarAsync(Stream.Null, FormatoDeExtrato.Ofx, Email, token);

        resultado.Should().Be(new ResultadoDoEnvioDaDemo.LimiteAtingido());
        _envio.Enviados.Should().BeEmpty();
    }

    [Fact]
    public async Task Mes_que_nao_esta_no_extrato_nao_envia()
    {
        var token = await TokenConfirmado();

        var resultado = await _enviar.ExecutarAsync(Stream.Null, FormatoDeExtrato.Ofx, Email, token, new MesDeReferencia(2026, 3));

        resultado.Should().Be(new ResultadoDoEnvioDaDemo.MesSemDados());
    }
}

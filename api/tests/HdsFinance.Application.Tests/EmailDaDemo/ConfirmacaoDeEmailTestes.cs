using FluentAssertions;
using HdsFinance.Application.EmailDaDemo;
using Microsoft.Extensions.Time.Testing;

namespace HdsFinance.Application.Tests.EmailDaDemo;

public class ConfirmacaoDeEmailTestes
{
    private readonly EnvioFalso _envio = new();
    private readonly LimiteFalso _limite = new();
    private readonly FakeTimeProvider _tempo = new(new DateTimeOffset(2026, 11, 9, 12, 0, 0, TimeSpan.Zero));
    private readonly ConfirmacaoDeEmail _confirmacao;

    public ConfirmacaoDeEmailTestes() =>
        _confirmacao = new ConfirmacaoDeEmail(_envio, new AssinadorFalso(), new CodigoFixo("123456"), _limite, _tempo);

    private async Task<string> DesafioPara(string email) =>
        ((ResultadoDoPedidoDeCodigo.CodigoEnviado)await _confirmacao.PedirCodigoAsync(email)).Desafio;

    [Fact]
    public async Task Envia_o_codigo_por_email_sem_guardar_nada_no_servidor()
    {
        var resultado = await _confirmacao.PedirCodigoAsync("  Pessoa@Exemplo.com ");

        resultado.Should().BeOfType<ResultadoDoPedidoDeCodigo.CodigoEnviado>();
        _envio.Enviados.Should().ContainSingle().Which.Para.Should().Be("pessoa@exemplo.com");
        _envio.Enviados[0].Html.Should().Contain("123456");
    }

    [Fact]
    public async Task O_desafio_nao_carrega_o_email_nem_o_codigo_em_texto()
    {
        var desafio = await DesafioPara("pessoa@exemplo.com");

        desafio.Should().NotContain("pessoa@exemplo.com").And.NotContain("123456");
    }

    [Fact]
    public async Task Codigo_certo_devolve_token_que_confirma_o_email()
    {
        var desafio = await DesafioPara("pessoa@exemplo.com");

        var resultado = _confirmacao.Confirmar("Pessoa@exemplo.com", "123456", desafio);

        var token = resultado.Should().BeOfType<ResultadoDaConfirmacao.Confirmado>().Subject.Token;
        _confirmacao.EstaConfirmado("pessoa@exemplo.com", token).Should().BeTrue();
        _confirmacao.EstaConfirmado("outra@exemplo.com", token).Should().BeFalse();
    }

    [Fact]
    public async Task Codigo_errado_nao_confirma()
    {
        var desafio = await DesafioPara("pessoa@exemplo.com");

        _confirmacao.Confirmar("pessoa@exemplo.com", "000000", desafio).Should().Be(new ResultadoDaConfirmacao.CodigoInvalido());
    }

    [Fact]
    public async Task O_desafio_de_um_email_nao_serve_para_outro()
    {
        var desafio = await DesafioPara("pessoa@exemplo.com");

        _confirmacao.Confirmar("outra@exemplo.com", "123456", desafio).Should().Be(new ResultadoDaConfirmacao.CodigoInvalido());
    }

    [Fact]
    public async Task Codigo_vence_em_dez_minutos()
    {
        var desafio = await DesafioPara("pessoa@exemplo.com");
        _tempo.Advance(TimeSpan.FromMinutes(11));

        _confirmacao.Confirmar("pessoa@exemplo.com", "123456", desafio).Should().Be(new ResultadoDaConfirmacao.Expirado());
    }

    [Fact]
    public async Task A_confirmacao_vence_em_trinta_dias()
    {
        var desafio = await DesafioPara("pessoa@exemplo.com");
        var token = ((ResultadoDaConfirmacao.Confirmado)_confirmacao.Confirmar("pessoa@exemplo.com", "123456", desafio)).Token;
        _tempo.Advance(TimeSpan.FromDays(31));

        _confirmacao.EstaConfirmado("pessoa@exemplo.com", token).Should().BeFalse();
    }

    [Fact]
    public void Token_adulterado_nao_confirma()
    {
        _confirmacao.EstaConfirmado("pessoa@exemplo.com", "qualquer-coisa").Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("sem-arroba")]
    [InlineData("a@b")]
    public async Task Email_invalido_nao_recebe_codigo(string email)
    {
        (await _confirmacao.PedirCodigoAsync(email)).Should().Be(new ResultadoDoPedidoDeCodigo.EmailInvalido());
        _envio.Enviados.Should().BeEmpty();
    }

    [Fact]
    public async Task Limite_de_codigos_por_email_e_contado_pelo_hash_do_endereco()
    {
        _limite.Liberado = false;

        (await _confirmacao.PedirCodigoAsync("pessoa@exemplo.com")).Should().Be(new ResultadoDoPedidoDeCodigo.LimiteAtingido());
        _limite.Chaves.Should().ContainSingle().Which.Should().NotContain("pessoa");
        _envio.Enviados.Should().BeEmpty();
    }
}

using FluentAssertions;
using HdsFinance.Application.Acesso;
using HdsFinance.Application.Admin;
using Microsoft.Extensions.Time.Testing;

namespace HdsFinance.Application.Tests.Acesso;

public class AcessoDoAdminTestes
{
    private const string EmailDoAdmin = "admin@exemplo.com";

    private readonly EnvioFalso _envio = new();
    private readonly LimiteFalso _limite = new();
    private readonly FakeTimeProvider _tempo = new(new DateTimeOffset(2026, 11, 24, 12, 0, 0, TimeSpan.Zero));

    private AcessoDoAdmin Acesso() =>
        new(new ConfiguracaoDoAdmin(EmailDoAdmin), _envio, new AssinadorFalso(), new CodigoFixo("123456"), _limite, _tempo);

    [Fact]
    public async Task Envia_o_codigo_so_para_o_email_do_admin()
    {
        var resultado = await Acesso().PedirCodigoAsync(" Admin@Exemplo.com ");

        resultado.Should().BeOfType<ResultadoDoPedidoDeCodigo.CodigoEnviado>();
        _envio.Enviados.Should().ContainSingle().Which.Para.Should().Be(EmailDoAdmin);
        _envio.Enviados[0].Html.Should().Contain("123456");
    }

    [Fact]
    public async Task Outro_email_recebe_a_mesma_resposta_mas_nenhum_email_sai()
    {
        var resultado = await Acesso().PedirCodigoAsync("curioso@exemplo.com");

        resultado.Should().BeOfType<ResultadoDoPedidoDeCodigo.CodigoEnviado>();
        _envio.Enviados.Should().BeEmpty();
    }

    [Fact]
    public async Task O_desafio_de_outro_email_nunca_vira_sessao_mesmo_com_o_codigo_certo()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)await acesso.PedirCodigoAsync("curioso@exemplo.com");

        acesso.Confirmar("123456", pedido.Desafio).Should().BeOfType<ResultadoDaConfirmacao.CodigoInvalido>();
    }

    [Fact]
    public async Task Codigo_certo_abre_uma_sessao_valida()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)await acesso.PedirCodigoAsync(EmailDoAdmin);

        var confirmacao = acesso.Confirmar(" 123456 ", pedido.Desafio);

        var sessao = confirmacao.Should().BeOfType<ResultadoDaConfirmacao.Confirmado>().Subject.Sessao;
        acesso.SessaoValida(sessao).Should().BeTrue();
    }

    [Fact]
    public async Task Codigo_errado_nao_abre_sessao()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)await acesso.PedirCodigoAsync(EmailDoAdmin);

        acesso.Confirmar("654321", pedido.Desafio).Should().BeOfType<ResultadoDaConfirmacao.CodigoInvalido>();
    }

    [Fact]
    public async Task Codigo_vence_em_dez_minutos()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)await acesso.PedirCodigoAsync(EmailDoAdmin);

        _tempo.Advance(TimeSpan.FromMinutes(11));

        acesso.Confirmar("123456", pedido.Desafio).Should().BeOfType<ResultadoDaConfirmacao.Expirado>();
    }

    [Fact]
    public async Task Tentativas_esgotadas_bloqueiam_o_desafio()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)await acesso.PedirCodigoAsync(EmailDoAdmin);
        _limite.Liberado = false;

        acesso.Confirmar("123456", pedido.Desafio).Should().BeOfType<ResultadoDaConfirmacao.TentativasEsgotadas>();
    }

    [Fact]
    public async Task Pedidos_demais_de_codigo_sao_barrados()
    {
        _limite.Liberado = false;

        (await Acesso().PedirCodigoAsync(EmailDoAdmin)).Should().BeOfType<ResultadoDoPedidoDeCodigo.LimiteAtingido>();
        _envio.Enviados.Should().BeEmpty();
    }

    [Fact]
    public async Task Sessao_vence_em_sete_dias()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)await acesso.PedirCodigoAsync(EmailDoAdmin);
        var sessao = ((ResultadoDaConfirmacao.Confirmado)acesso.Confirmar("123456", pedido.Desafio)).Sessao;

        _tempo.Advance(TimeSpan.FromDays(7) + TimeSpan.FromMinutes(1));

        acesso.SessaoValida(sessao).Should().BeFalse();
    }

    [Fact]
    public async Task O_desafio_nao_serve_como_sessao()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)await acesso.PedirCodigoAsync(EmailDoAdmin);

        acesso.SessaoValida(pedido.Desafio).Should().BeFalse();
        acesso.SessaoValida("qualquer coisa").Should().BeFalse();
    }

    [Fact]
    public async Task Falha_no_servico_de_email_vira_resultado_tipado()
    {
        _envio.Resposta = new ResultadoDoEnvio.Falha("fora do ar");

        (await Acesso().PedirCodigoAsync(EmailDoAdmin)).Should().BeOfType<ResultadoDoPedidoDeCodigo.FalhaNoEnvio>();
    }
}

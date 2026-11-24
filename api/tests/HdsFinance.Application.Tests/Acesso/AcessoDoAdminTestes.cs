using FluentAssertions;
using HdsFinance.Application.Acesso;
using Microsoft.Extensions.Time.Testing;

namespace HdsFinance.Application.Tests.Acesso;

public class AcessoDoAdminTestes
{
    private const string EmailDoAdmin = "admin@exemplo.com";

    private readonly EnvioEmSegundoPlanoFalso _envio = new();
    private readonly LimiteFalso _limite = new();
    private readonly FakeTimeProvider _tempo = new(new DateTimeOffset(2026, 11, 24, 12, 0, 0, TimeSpan.Zero));

    private AcessoDoAdmin Acesso() =>
        new(new ConfiguracaoDoAdmin(EmailDoAdmin), _envio, new AssinadorFalso(), new CodigoFixo("123456"), _limite, _tempo);

    [Fact]
    public void Envia_o_codigo_so_para_o_email_do_admin()
    {
        var resultado = Acesso().PedirCodigo(" Admin@Exemplo.com ", "ip", null);

        resultado.Should().BeOfType<ResultadoDoPedidoDeCodigo.CodigoEnviado>();
        _envio.Enviados.Should().ContainSingle().Which.Para.Should().Be(EmailDoAdmin);
        _envio.Enviados[0].Html.Should().Contain("123456");
    }

    [Fact]
    public void Outro_email_recebe_a_mesma_resposta_mas_nenhum_email_sai()
    {
        var resultado = Acesso().PedirCodigo("curioso@exemplo.com", "ip", null);

        resultado.Should().BeOfType<ResultadoDoPedidoDeCodigo.CodigoEnviado>();
        _envio.Enviados.Should().BeEmpty();
    }

    [Fact]
    public void O_desafio_de_outro_email_nunca_vira_sessao_mesmo_com_o_codigo_certo()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)acesso.PedirCodigo("curioso@exemplo.com", "ip", null);

        acesso.Confirmar("123456", pedido.Desafio).Should().BeOfType<ResultadoDaConfirmacao.CodigoInvalido>();
    }

    [Fact]
    public void Codigo_certo_abre_uma_sessao_valida()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)acesso.PedirCodigo(EmailDoAdmin, "ip", null);

        var confirmacao = acesso.Confirmar(" 123456 ", pedido.Desafio);

        var sessao = confirmacao.Should().BeOfType<ResultadoDaConfirmacao.Confirmado>().Subject.Sessao;
        acesso.SessaoValida(sessao).Should().BeTrue();
    }

    [Fact]
    public void Codigo_errado_nao_abre_sessao()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)acesso.PedirCodigo(EmailDoAdmin, "ip", null);

        acesso.Confirmar("654321", pedido.Desafio).Should().BeOfType<ResultadoDaConfirmacao.CodigoInvalido>();
    }

    [Fact]
    public void Codigo_vence_em_dez_minutos()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)acesso.PedirCodigo(EmailDoAdmin, "ip", null);

        _tempo.Advance(TimeSpan.FromMinutes(11));

        acesso.Confirmar("123456", pedido.Desafio).Should().BeOfType<ResultadoDaConfirmacao.Expirado>();
    }

    [Fact]
    public void Tentativas_esgotadas_bloqueiam_o_desafio()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)acesso.PedirCodigo(EmailDoAdmin, "ip", null);
        _limite.Liberado = false;

        acesso.Confirmar("123456", pedido.Desafio).Should().BeOfType<ResultadoDaConfirmacao.TentativasEsgotadas>();
    }

    [Fact]
    public void Pedidos_demais_de_codigo_sao_barrados()
    {
        _limite.Liberado = false;

        Acesso().PedirCodigo(EmailDoAdmin, "ip", null).Should().BeOfType<ResultadoDoPedidoDeCodigo.LimiteAtingido>();
        _envio.Enviados.Should().BeEmpty();
    }

    [Fact]
    public void Sessao_vence_em_sete_dias()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)acesso.PedirCodigo(EmailDoAdmin, "ip", null);
        var sessao = ((ResultadoDaConfirmacao.Confirmado)acesso.Confirmar("123456", pedido.Desafio)).Sessao;

        _tempo.Advance(TimeSpan.FromDays(7) + TimeSpan.FromMinutes(1));

        acesso.SessaoValida(sessao).Should().BeFalse();
    }

    [Fact]
    public void O_desafio_nao_serve_como_sessao()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)acesso.PedirCodigo(EmailDoAdmin, "ip", null);

        acesso.SessaoValida(pedido.Desafio).Should().BeFalse();
        acesso.SessaoValida("qualquer coisa").Should().BeFalse();
    }

    [Fact]
    public void Um_curioso_que_gasta_os_pedidos_nao_bloqueia_outra_origem()
    {
        _limite.Esgotadas.Add("codigo:ip-do-curioso");

        Acesso().PedirCodigo(EmailDoAdmin, "ip-do-curioso", null).Should().BeOfType<ResultadoDoPedidoDeCodigo.LimiteAtingido>();
        Acesso().PedirCodigo(EmailDoAdmin, "outro-ip", null).Should().BeOfType<ResultadoDoPedidoDeCodigo.CodigoEnviado>();
        _envio.Enviados.Should().ContainSingle();
    }

    [Fact]
    public void O_teto_de_envios_para_o_email_sem_mudar_a_resposta()
    {
        _limite.Esgotadas.Add("envios");

        Acesso().PedirCodigo(EmailDoAdmin, "ip", null).Should().BeOfType<ResultadoDoPedidoDeCodigo.CodigoEnviado>();
        _envio.Enviados.Should().BeEmpty();
    }

    [Fact]
    public void Um_navegador_que_ja_entrou_tem_limite_proprio()
    {
        var acesso = Acesso();
        var pedido = (ResultadoDoPedidoDeCodigo.CodigoEnviado)acesso.PedirCodigo(EmailDoAdmin, "ip", null);
        var dispositivo = ((ResultadoDaConfirmacao.Confirmado)acesso.Confirmar("123456", pedido.Desafio)).Dispositivo;
        _limite.Esgotadas.UnionWith(["codigo:ip", "envios"]);

        acesso.PedirCodigo(EmailDoAdmin, "ip", dispositivo);

        _envio.Enviados.Should().HaveCount(2);
        acesso.SessaoValida(dispositivo).Should().BeFalse();
        acesso.DispositivoConhecido("inventado").Should().BeFalse();
    }

    [Fact]
    public void Desafio_inventado_nao_ocupa_o_limite_em_memoria()
    {
        Acesso().Confirmar("123456", "inventado").Should().BeOfType<ResultadoDaConfirmacao.CodigoInvalido>();

        _limite.Chaves.Should().BeEmpty();
    }
}

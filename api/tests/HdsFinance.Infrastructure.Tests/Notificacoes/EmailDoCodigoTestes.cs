using FluentAssertions;
using HdsFinance.Infrastructure.Notificacoes;
using HdsFinance.Infrastructure.Relatorios;

namespace HdsFinance.Infrastructure.Tests.Notificacoes;

public class EmailDoCodigoTestes
{
    [Fact]
    public void Traz_o_codigo_em_destaque_a_validade_e_as_cores_do_projeto()
    {
        var email = EmailDoCodigo.Montar("admin@exemplo.com", "123456");

        email.Para.Should().Be("admin@exemplo.com");
        email.Html.Should().Contain("123456").And.Contain("10 minutos").And.Contain("hds finance").And.Contain(CoresDoRelatorio.Primaria);
    }

    [Fact]
    public void O_assunto_nao_mostra_o_codigo_na_notificacao_do_celular()
    {
        EmailDoCodigo.Montar("admin@exemplo.com", "123456").Assunto.Should().Be("Código de acesso - hds finance");
    }

    [Fact]
    public void Nao_carrega_nada_de_fora()
    {
        EmailDoCodigo.Montar("admin@exemplo.com", "123456").Html.Should().NotContain("http").And.NotContain("<img");
    }
}

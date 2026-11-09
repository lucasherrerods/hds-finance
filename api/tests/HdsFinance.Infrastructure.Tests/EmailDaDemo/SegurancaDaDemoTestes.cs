using FluentAssertions;
using HdsFinance.Infrastructure.EmailDaDemo;
using Microsoft.Extensions.Time.Testing;

namespace HdsFinance.Infrastructure.Tests.EmailDaDemo;

public class AssinadorHmacTestes
{
    private readonly AssinadorHmac _assinador = new("uma-chave-ficticia-com-tamanho-suficiente");

    [Fact]
    public void Abre_o_que_ele_mesmo_assinou()
    {
        _assinador.Abrir(_assinador.Assinar("confirmado|abc|123")).Should().Be("confirmado|abc|123");
    }

    [Fact]
    public void Recusa_token_alterado()
    {
        var token = _assinador.Assinar("confirmado|abc|123");
        var alterado = "X" + token[1..];

        _assinador.Abrir(alterado).Should().BeNull();
        _assinador.Abrir("sem-ponto").Should().BeNull();
        _assinador.Abrir("").Should().BeNull();
    }

    [Fact]
    public void Recusa_token_assinado_com_outra_chave()
    {
        var token = new AssinadorHmac("outra-chave-ficticia-com-tamanho-suficiente").Assinar("confirmado|abc|123");

        _assinador.Abrir(token).Should().BeNull();
    }

    [Fact]
    public void O_resumo_depende_da_chave()
    {
        _assinador.Resumir("a@b.com|123456").Should().Be(_assinador.Resumir("a@b.com|123456"))
            .And.NotBe(new AssinadorHmac("outra-chave-ficticia-com-tamanho-suficiente").Resumir("a@b.com|123456"));
    }

    [Fact]
    public void Chave_curta_demais_e_recusada()
    {
        var criar = () => new AssinadorHmac("curta");

        criar.Should().Throw<ArgumentException>();
    }
}

public class GeradorDeCodigoAleatorioTestes
{
    [Fact]
    public void Gera_seis_digitos()
    {
        var codigos = Enumerable.Range(0, 50).Select(_ => new GeradorDeCodigoAleatorio().NovoCodigo()).ToList();

        codigos.Should().OnlyContain(c => c.Length == 6 && c.All(char.IsDigit));
        codigos.Distinct().Should().HaveCountGreaterThan(1);
    }
}

public class LimiteDeEnviosEmMemoriaTestes
{
    [Fact]
    public void Permite_ate_o_maximo_dentro_da_janela_e_libera_depois()
    {
        var tempo = new FakeTimeProvider();
        var limite = new LimiteDeEnviosEmMemoria(tempo);

        Enumerable.Range(0, 3).Select(_ => limite.Permitir("k", 3, TimeSpan.FromHours(1))).ToList().Should().AllBeEquivalentTo(true);
        limite.Permitir("k", 3, TimeSpan.FromHours(1)).Should().BeFalse();
        limite.Permitir("outra", 3, TimeSpan.FromHours(1)).Should().BeTrue();

        tempo.Advance(TimeSpan.FromHours(1) + TimeSpan.FromSeconds(1));
        limite.Permitir("k", 3, TimeSpan.FromHours(1)).Should().BeTrue();
    }
}

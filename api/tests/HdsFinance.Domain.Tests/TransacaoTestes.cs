using FluentAssertions;

namespace HdsFinance.Domain.Tests;

public class TransacaoTestes
{
    private static readonly DateOnly Dia = new(2026, 10, 5);

    [Fact]
    public void Usa_o_id_externo_como_chave_quando_existe()
    {
        var transacao = new Transacao(Dia, -50m, "Mercado", TipoDeTransacao.Comum, "FIT-123");

        transacao.ChaveDeDeduplicacao.Should().Be("FIT-123");
    }

    [Fact]
    public void Sem_id_externo_a_chave_ignora_maiusculas_acentos_e_espacos_extras()
    {
        var a = new Transacao(Dia, -50m, "  Pão  de Açúcar ", TipoDeTransacao.Comum);
        var b = new Transacao(Dia, -50.00m, "PAO DE ACUCAR", TipoDeTransacao.Comum);

        a.ChaveDeDeduplicacao.Should().Be(b.ChaveDeDeduplicacao);
    }

    [Fact]
    public void Sem_id_externo_valores_diferentes_geram_chaves_diferentes()
    {
        var a = new Transacao(Dia, -50m, "Mercado", TipoDeTransacao.Comum);
        var b = new Transacao(Dia, -51m, "Mercado", TipoDeTransacao.Comum);

        a.ChaveDeDeduplicacao.Should().NotBe(b.ChaveDeDeduplicacao);
    }
}

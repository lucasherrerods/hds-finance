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

    [Fact]
    public void Repetidas_no_mesmo_arquivo_ganham_chaves_diferentes_e_a_primeira_mantem_a_chave_antiga()
    {
        var pedagio = new Transacao(Dia, -3.65m, "Rodoanel Pedagio", TipoDeTransacao.Comum);
        var mercado = new Transacao(Dia, -50m, "Mercado", TipoDeTransacao.Comum);

        var numeradas = Transacao.NumerarRepetidas([pedagio, mercado, pedagio]);

        numeradas.Select(t => t.ChaveDeDeduplicacao).Should().OnlyHaveUniqueItems();
        numeradas[0].ChaveDeDeduplicacao.Should().Be(pedagio.ChaveDeDeduplicacao);
        numeradas[1].Should().Be(mercado);
        numeradas[2].Ocorrencia.Should().Be(2);
    }

    [Fact]
    public void Numerar_o_mesmo_arquivo_de_novo_gera_as_mesmas_chaves()
    {
        var pedagio = new Transacao(Dia, -3.65m, "Rodoanel Pedagio", TipoDeTransacao.Comum);

        var primeira = Transacao.NumerarRepetidas([pedagio, pedagio]).Select(t => t.ChaveDeDeduplicacao);
        var segunda = Transacao.NumerarRepetidas([pedagio, pedagio]).Select(t => t.ChaveDeDeduplicacao);

        primeira.Should().Equal(segunda);
    }

    [Fact]
    public void Com_id_externo_a_repetida_continua_com_a_mesma_chave()
    {
        var comId = new Transacao(Dia, -3.65m, "Pedagio", TipoDeTransacao.Comum, "FIT-1");

        var numeradas = Transacao.NumerarRepetidas([comId, comId]);

        numeradas.Select(t => t.ChaveDeDeduplicacao).Should().AllBe("FIT-1");
    }
}

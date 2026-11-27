using FluentAssertions;

namespace HdsFinance.Domain.Tests;

public class RecorrentesTestes
{
    private static readonly MesDeReferencia Novembro = new(2026, 11);

    private static Transacao Gasto(int mes, int dia, decimal valor, string descricao) =>
        new(new DateOnly(2026, mes, dia), -valor, descricao, TipoDeTransacao.Comum);

    private static IReadOnlyList<Recorrente> Detectar(params Transacao[] transacoes) =>
        Recorrentes.Detectar(transacoes, Categorizador.Padrao, Novembro);

    [Fact]
    public void Acha_o_que_se_repete_todo_mes_com_valor_parecido()
    {
        var recorrentes = Detectar(Gasto(8, 9, 12.90m, "EBN SPOTIFY"), Gasto(9, 9, 12.90m, "EBN SPOTIFY"), Gasto(10, 9, 12.90m, "EBN SPOTIFY"));

        recorrentes.Should().ContainSingle().Which.Should().Be(
            new Recorrente("EBN SPOTIFY", "Streaming de música", 12.90m, 9, SituacaoDaRecorrente.Pendente, null));
    }

    [Fact]
    public void Paga_no_mes_e_mais_cara_quando_o_valor_subiu()
    {
        var recorrentes = Detectar(
            Gasto(8, 5, 117m, "Pix enviado Fabio"), Gasto(9, 5, 117m, "Pix enviado Fabio"), Gasto(10, 5, 125m, "Pix enviado Fabio"), Gasto(11, 8, 152.50m, "Pix enviado Fabio"),
            Gasto(9, 9, 12.90m, "EBN SPOTIFY"), Gasto(10, 9, 12.90m, "EBN SPOTIFY"), Gasto(11, 9, 12.90m, "EBN SPOTIFY"));

        recorrentes.Select(r => (r.Descricao, r.Situacao)).Should().Equal(
            ("Pix enviado Fabio", SituacaoDaRecorrente.MaisCara), ("EBN SPOTIFY", SituacaoDaRecorrente.Paga));
    }

    [Fact]
    public void Ignora_gasto_de_varias_vezes_no_mes_valor_que_varia_muito_parcela_e_o_que_parou()
    {
        var recorrentes = Detectar(
            Gasto(9, 1, 3.65m, "Rodoanel Pedagio"), Gasto(9, 2, 3.65m, "Rodoanel Pedagio"), Gasto(9, 3, 3.65m, "Rodoanel Pedagio"),
            Gasto(10, 1, 3.65m, "Rodoanel Pedagio"), Gasto(10, 2, 3.65m, "Rodoanel Pedagio"), Gasto(11, 1, 3.65m, "Rodoanel Pedagio"),
            Gasto(8, 3, 20m, "Mercado Exemplo"), Gasto(9, 3, 200m, "Mercado Exemplo"), Gasto(10, 3, 90m, "Mercado Exemplo"),
            Gasto(8, 9, 30m, "LITE VivoEasy (Parcela 01 de 12)"), Gasto(9, 9, 30m, "LITE VivoEasy (Parcela 01 de 12)"), Gasto(10, 9, 30m, "LITE VivoEasy (Parcela 01 de 12)"),
            Gasto(5, 2, 50m, "Academia Antiga"), Gasto(6, 2, 50m, "Academia Antiga"), Gasto(7, 2, 50m, "Academia Antiga"));

        recorrentes.Should().BeEmpty();
    }
}

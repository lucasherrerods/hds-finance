using System.Text;
using FluentAssertions;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Relatorios;

namespace HdsFinance.Infrastructure.Tests.Relatorios;

public class RelatorioQuestPdfTestes
{
    private static ResumoMensal Mes(int mes, decimal? saldoInicial = 1000m) =>
        new ResumoMensal(new MesDeReferencia(2026, mes), saldoInicial, 3500m, 1234.56m, -1000m)
        {
            GastosPorCategoria = [new GastoPorCategoria("Alimentação", 800m), new GastoPorCategoria("Transporte", 434.56m)],
            Investimentos = new PosicaoDeInvestimento(1000m, 0m, 1000m * mes),
        };

    private static bool EhPdf(byte[] bytes) => Encoding.ASCII.GetString(bytes, 0, 5) == "%PDF-";

    [Fact]
    public void Gera_um_pdf_com_o_mes_e_o_historico()
    {
        var historico = Enumerable.Range(1, 10).Select(m => Mes(m)).ToList();

        var pdf = new RelatorioQuestPdf().Gerar(new Relatorio(historico[^1], historico, new DateOnly(2026, 11, 9)));

        EhPdf(pdf).Should().BeTrue();
    }

    private static string TextoDo(byte[] pdf)
    {
        using var documento = UglyToad.PdfPig.PdfDocument.Open(pdf);
        return string.Join(" ", documento.GetPages().SelectMany(p => p.GetWords()).Select(w => w.Text));
    }

    [Fact]
    public void Abre_com_o_que_sobrou_e_compara_com_o_mes_anterior()
    {
        var setembro = Mes(9) with { Saidas = 1000m, GastosPorCategoria = [new GastoPorCategoria("Alimentação", 400m)] };
        var outubro = Mes(10);

        var texto = TextoDo(new RelatorioQuestPdf().Gerar(new Relatorio(outubro, [setembro, outubro], new DateOnly(2026, 11, 9))));

        texto.Should().Contain("Sobrou no mês").And.Contain("R$ 2.265,44").And.Contain("65% do que entrou");
        texto.Should().Contain("+23% vs. set/26").And.Contain("+100%").And.Contain("Mês a mês");
    }

    [Fact]
    public void Mes_no_vermelho_diz_que_faltou()
    {
        var mes = Mes(10) with { Entradas = 1000m };

        TextoDo(new RelatorioQuestPdf().Gerar(new Relatorio(mes, [mes], new DateOnly(2026, 11, 9))))
            .Should().Contain("Faltou no mês").And.Contain("R$ 234,56").And.Contain("123% do que entrou");
    }

    [Fact]
    public void Gera_mesmo_sem_saldo_sem_categorias_e_sem_historico()
    {
        var mes = new ResumoMensal(new MesDeReferencia(2026, 10), null, 0m, 0m, 0m);

        var pdf = new RelatorioQuestPdf().Gerar(new Relatorio(mes, [mes], new DateOnly(2026, 11, 9)));

        EhPdf(pdf).Should().BeTrue();
    }
}

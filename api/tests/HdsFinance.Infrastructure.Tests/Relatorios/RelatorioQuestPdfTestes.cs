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

    [Fact]
    public void Gera_mesmo_sem_saldo_sem_categorias_e_sem_historico()
    {
        var mes = new ResumoMensal(new MesDeReferencia(2026, 10), null, 0m, 0m, 0m);

        var pdf = new RelatorioQuestPdf().Gerar(new Relatorio(mes, [mes], new DateOnly(2026, 11, 9)));

        EhPdf(pdf).Should().BeTrue();
    }
}

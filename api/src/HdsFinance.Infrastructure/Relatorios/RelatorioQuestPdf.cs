using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using static HdsFinance.Infrastructure.Relatorios.FormatoBrasileiro;

namespace HdsFinance.Infrastructure.Relatorios;

/// <summary>O fechamento do mês em PDF, gerado inteiro em memória.</summary>
public sealed class RelatorioQuestPdf : IGeradorDeRelatorio
{
    static RelatorioQuestPdf()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] Gerar(Relatorio relatorio) => Document.Create(documento => documento.Page(pagina =>
    {
        pagina.Size(PageSizes.A4);
        pagina.Margin(40);
        pagina.PageColor(CoresDoRelatorio.Fundo);
        pagina.DefaultTextStyle(t => t.FontSize(10).FontColor(CoresDoRelatorio.Texto).LineHeight(1.5f));

        pagina.Header().PaddingBottom(24).Column(c =>
        {
            c.Item().Text("hds finance").FontSize(10).FontColor(CoresDoRelatorio.Primaria).SemiBold();
            c.Item().Text($"Fechamento de {Mes(relatorio.Mes.Mes)}").FontSize(24).Bold().LineHeight(1.1f);
        });

        pagina.Content().Column(c =>
        {
            c.Spacing(24);
            c.Item().Element(e => Resumo(e, relatorio.Mes));
            if (relatorio.Historico.Count > 1)
            {
                c.Item().Element(e => EntradasESaidas(e, relatorio.Historico));
            }

            if (relatorio.Historico.Any(m => m.SaldoFinal is not null))
            {
                c.Item().Element(e => EvolucaoDoSaldo(e, relatorio.Historico));
            }

            c.Item().Element(e => GastosPorCategoria(e, relatorio.Mes));
        });

        pagina.Footer().Row(r =>
        {
            r.RelativeItem().Text($"Gerado em {Data(relatorio.GeradoEm)}").FontSize(8).FontColor(CoresDoRelatorio.TextoSuave);
            r.RelativeItem().AlignRight().Text(t =>
            {
                t.DefaultTextStyle(s => s.FontSize(8).FontColor(CoresDoRelatorio.TextoSuave));
                t.CurrentPageNumber();
                t.Span(" / ");
                t.TotalPages();
            });
        });
    })).GeneratePdf();

    private static void Resumo(IContainer container, ResumoMensal mes) => Cartao(container, "Resumo do mês", c =>
    {
        c.Item().Row(r =>
        {
            r.Spacing(8);
            Indicador(r.RelativeItem(), "Entrou", $"+{Moeda(mes.Entradas)}", CoresDoRelatorio.Entrada);
            Indicador(r.RelativeItem(), "Saiu", $"−{Moeda(mes.Saidas)}", CoresDoRelatorio.Saida);
            Indicador(r.RelativeItem(), "Resultado", Moeda(mes.Resultado), CoresDoRelatorio.Texto);
        });
        c.Item().PaddingTop(8).Row(r =>
        {
            r.Spacing(8);
            Indicador(r.RelativeItem(), "Investimentos e transferências", Moeda(mes.InvestimentosETransferencias), CoresDoRelatorio.Texto);
            Indicador(r.RelativeItem(), "Saldo", $"{Moeda(mes.SaldoInicial)} → {Moeda(mes.SaldoFinal)}", CoresDoRelatorio.Texto);
        });
    });

    private static void EntradasESaidas(IContainer container, IReadOnlyList<ResumoMensal> historico) =>
        Cartao(container, $"Entradas x saídas nos últimos {historico.Count} meses", c =>
        {
            var maximo = historico.Max(m => Math.Max(m.Entradas, m.Saidas));
            foreach (var mes in historico)
            {
                c.Item().Row(r =>
                {
                    r.ConstantItem(48).Text(MesCurto(mes.Mes)).FontColor(CoresDoRelatorio.TextoSuave);
                    r.RelativeItem().Column(barras =>
                    {
                        barras.Spacing(2);
                        barras.Item().Element(e => Barra(e, mes.Entradas, maximo, CoresDoRelatorio.Entrada, $"+{Moeda(mes.Entradas)}"));
                        barras.Item().Element(e => Barra(e, mes.Saidas, maximo, CoresDoRelatorio.Saida, $"−{Moeda(mes.Saidas)}"));
                    });
                });
            }

            c.Item().PaddingTop(4).Text("+ entrou   − saiu").FontSize(8).FontColor(CoresDoRelatorio.TextoSuave);
        });

    private static void EvolucaoDoSaldo(IContainer container, IReadOnlyList<ResumoMensal> historico) =>
        Cartao(container, "Saldo no fim de cada mês", c =>
        {
            var maximo = historico.Max(m => Math.Abs(m.SaldoFinal ?? 0m));
            foreach (var mes in historico)
            {
                c.Item().Row(r =>
                {
                    r.ConstantItem(48).Text(MesCurto(mes.Mes)).FontColor(CoresDoRelatorio.TextoSuave);
                    r.RelativeItem().Element(e => Barra(e, Math.Abs(mes.SaldoFinal ?? 0m), maximo, CoresDoRelatorio.Primaria, Moeda(mes.SaldoFinal)));
                });
            }
        });

    private static void GastosPorCategoria(IContainer container, ResumoMensal mes) => Cartao(container, "Gastos por categoria", c =>
    {
        if (mes.GastosPorCategoria.Count == 0)
        {
            c.Item().Text("Nenhum gasto no mês.").FontColor(CoresDoRelatorio.TextoSuave);
            return;
        }

        var maximo = mes.GastosPorCategoria.Max(g => g.Valor);
        var total = mes.GastosPorCategoria.Sum(g => g.Valor);
        foreach (var (gasto, indice) in mes.GastosPorCategoria.Select((g, i) => (g, i)))
        {
            var cor = CoresDoRelatorio.Grafico[indice % CoresDoRelatorio.Grafico.Length];
            c.Item().Row(r =>
            {
                r.ConstantItem(120).Text(gasto.Categoria);
                r.RelativeItem().Element(e => Barra(e, gasto.Valor, maximo, cor, $"{Moeda(gasto.Valor)} · {gasto.Valor / total:P0}"));
            });
        }
    });

    private static void Cartao(IContainer container, string titulo, Action<ColumnDescriptor> conteudo) =>
        container.Background(CoresDoRelatorio.Superficie).Border(1).BorderColor(CoresDoRelatorio.Borda).CornerRadius(12).Padding(16)
            .Column(c =>
            {
                c.Spacing(6);
                c.Item().PaddingBottom(4).Text(titulo).FontSize(12).SemiBold();
                conteudo(c);
            });

    private static void Indicador(IContainer container, string rotulo, string valor, string cor) =>
        container.Background(CoresDoRelatorio.Fundo).CornerRadius(8).Padding(10).Column(c =>
        {
            c.Item().Text(rotulo).FontSize(8).FontColor(CoresDoRelatorio.TextoSuave);
            c.Item().Text(valor).FontSize(12).SemiBold().FontColor(cor);
        });

    /// <summary>Barra proporcional ao maior valor, com o valor escrito ao lado para não depender só da cor.</summary>
    private static void Barra(IContainer container, decimal valor, decimal maximo, string cor, string texto) =>
        container.Row(r =>
        {
            r.Spacing(6);
            var proporcao = maximo > 0 ? (float)(valor / maximo) : 0f;
            r.RelativeItem().AlignMiddle().Row(trilho =>
            {
                if (proporcao > 0)
                {
                    trilho.RelativeItem(proporcao).Height(8).Background(cor).CornerRadius(4);
                }

                if (proporcao < 1)
                {
                    trilho.RelativeItem(1 - proporcao);
                }
            });
            r.ConstantItem(110).AlignRight().Text(texto).FontSize(9);
        });
}

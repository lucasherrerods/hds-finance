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

        pagina.Header().ShowOnce().PaddingBottom(20).Column(c =>
        {
            c.Item().Text("hds finance").FontSize(10).FontColor(CoresDoRelatorio.Primaria).SemiBold();
            c.Item().Text($"Fechamento de {Mes(relatorio.Mes.Mes)}").FontSize(24).Bold().LineHeight(1.1f);
        });

        pagina.Content().Column(c =>
        {
            c.Spacing(16);
            c.Item().Element(e => Resultado(e, relatorio));
            c.Item().Element(e => Indicadores(e, relatorio));
            c.Item().Element(e => GastosPorCategoria(e, relatorio));
            if (relatorio.Historico.Count > 1)
            {
                c.Item().ShowEntire().Element(e => EntradasESaidas(e, relatorio.Historico));
                c.Item().Element(e => MesAMes(e, relatorio));
            }

            if (relatorio.Historico.Any(m => m.Investimentos.AplicadoAcumulado != 0m || m.Investimentos.Aplicado != 0m))
            {
                c.Item().ShowEntire().Element(e => Investimentos(e, relatorio.Mes, relatorio.Historico[0]));
            }
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

    /// <summary>A resposta do mês em uma frase: sobrou ou faltou, e quanto disso é da renda.</summary>
    private static void Resultado(IContainer container, Relatorio relatorio)
    {
        var mes = relatorio.Mes;
        var sobrou = mes.Resultado >= 0m;
        container.Background(sobrou ? CoresDoRelatorio.PrimariaSuave : CoresDoRelatorio.Superficie).Border(1).BorderColor(CoresDoRelatorio.Borda).CornerRadius(12).Padding(20).Row(r =>
        {
            r.RelativeItem().Column(c =>
            {
                c.Item().Text(sobrou ? "Sobrou no mês" : "Faltou no mês").FontColor(CoresDoRelatorio.TextoSuave);
                c.Item().Text(Moeda(Math.Abs(mes.Resultado))).FontSize(32).Bold().LineHeight(1.1f)
                    .FontColor(sobrou ? CoresDoRelatorio.Entrada : CoresDoRelatorio.Saida);
            });
            r.RelativeItem().AlignRight().AlignMiddle().Column(c =>
            {
                if (mes.Entradas > 0m)
                {
                    c.Item().AlignRight().Text(sobrou
                        ? $"{Percentual(mes.Resultado / mes.Entradas)} do que entrou ficou com você"
                        : $"Os gastos foram {Percentual(mes.Saidas / mes.Entradas)} do que entrou");
                }

                if (relatorio.Anterior is { } anterior)
                {
                    c.Item().AlignRight().Text($"Em {MesCurto(anterior.Mes)}: {Moeda(anterior.Resultado)}").FontColor(CoresDoRelatorio.TextoSuave);
                }
            });
        });
    }

    private static void Indicadores(IContainer container, Relatorio relatorio)
    {
        var (mes, anterior) = (relatorio.Mes, relatorio.Anterior);
        container.Column(c =>
        {
            c.Spacing(8);
            c.Item().Row(r =>
            {
                r.Spacing(8);
                Destaque(r.RelativeItem(), "Entrou", $"+{Moeda(mes.Entradas)}", CoresDoRelatorio.Entrada, Comparado(mes.Entradas, anterior?.Entradas));
                Destaque(r.RelativeItem(), "Saiu", $"−{Moeda(mes.Saidas)}", CoresDoRelatorio.Saida, Comparado(mes.Saidas, anterior?.Saidas));
                if (mes.GastosPorCategoria is [var maior, ..])
                {
                    Destaque(r.RelativeItem(), "Onde mais gastou", maior.Categoria, CoresDoRelatorio.Texto, Moeda(maior.Valor));
                }
            });
            c.Item().Row(r =>
            {
                r.Spacing(8);
                Destaque(r.RelativeItem(), "Investimentos e transferências", Moeda(mes.InvestimentosETransferencias), CoresDoRelatorio.Texto, null);
                if (mes.Emprestimos != 0m)
                {
                    Destaque(r.RelativeItem(), "Empréstimos recebidos", Moeda(mes.Emprestimos), CoresDoRelatorio.Texto, "Não contam como receita");
                }

                if (mes.ComprasNoCartao != 0m)
                {
                    Destaque(r.RelativeItem(), "Compras no cartão", Moeda(mes.ComprasNoCartao), CoresDoRelatorio.Texto, Comparado(mes.ComprasNoCartao, anterior?.ComprasNoCartao));
                }

                if (mes.SaldoFinal is { } saldo)
                {
                    Destaque(r.RelativeItem(), "Saldo no fim do mês", Moeda(saldo), CoresDoRelatorio.Texto, null);
                }
            });
        });

        string? Comparado(decimal atual, decimal? antes) =>
            Relatorio.Variacao(atual, antes) is { } variacao ? $"{PercentualComSinal(variacao)} vs. {MesCurto(anterior!.Mes)}" : null;
    }

    private const float AlturaDasBarras = 96;

    private static void EntradasESaidas(IContainer container, IReadOnlyList<ResumoMensal> historico) =>
        Cartao(container, $"Entradas x saídas nos últimos {historico.Count} meses", c =>
        {
            var maximo = historico.Max(m => Math.Max(m.Entradas, m.Saidas));
            c.Item().Row(r =>
            {
                r.Spacing(8);
                foreach (var mes in historico)
                {
                    r.RelativeItem().Column(coluna =>
                    {
                        coluna.Item().Height(AlturaDasBarras).AlignCenter().Row(barras =>
                        {
                            barras.Spacing(2);
                            barras.ConstantItem(12).AlignBottom().Element(e => Coluna(e, mes.Entradas, maximo, CoresDoRelatorio.Entrada));
                            barras.ConstantItem(12).AlignBottom().Element(e => Coluna(e, mes.Saidas, maximo, CoresDoRelatorio.Saida));
                        });
                        coluna.Item().BorderTop(1).BorderColor(CoresDoRelatorio.Borda).PaddingTop(4).AlignCenter()
                            .Text(MesCurto(mes.Mes)).FontSize(8).FontColor(CoresDoRelatorio.TextoSuave);
                    });
                }
            });
            c.Item().Text("Em cada mês, a barra da esquerda é o que entrou e a da direita é o que saiu.")
                .FontSize(8).FontColor(CoresDoRelatorio.TextoSuave);
        });

    private static void Coluna(IContainer container, decimal valor, decimal maximo, string cor)
    {
        if (valor > 0m && maximo > 0m)
        {
            container.Height(Math.Max(2f, (float)(valor / maximo) * AlturaDasBarras)).Background(cor).CornerRadius(3);
        }
    }

    private static void MesAMes(IContainer container, Relatorio relatorio) => Cartao(container, "Mês a mês", c => c.Item().Table(t =>
    {
        t.ColumnsDefinition(colunas =>
        {
            colunas.RelativeColumn();
            colunas.RelativeColumn();
            colunas.RelativeColumn();
            colunas.RelativeColumn();
        });
        t.Header(h =>
        {
            h.Cell().Element(Topo).Text("Mês");
            h.Cell().Element(Topo).AlignRight().Text("Entrou");
            h.Cell().Element(Topo).AlignRight().Text("Saiu");
            h.Cell().Element(Topo).AlignRight().Text("Resultado");
        });
        foreach (var mes in relatorio.Historico.Reverse())
        {
            t.Cell().Element(Linha).Text(MesCurto(mes.Mes));
            t.Cell().Element(Linha).AlignRight().Text($"+{Moeda(mes.Entradas)}").FontColor(CoresDoRelatorio.Entrada);
            t.Cell().Element(Linha).AlignRight().Text($"−{Moeda(mes.Saidas)}").FontColor(CoresDoRelatorio.Saida);
            t.Cell().Element(Linha).AlignRight().Text(Moeda(mes.Resultado)).SemiBold();
        }
    }));

    private static void GastosPorCategoria(IContainer container, Relatorio relatorio) => Cartao(container, "Gastos por categoria", c =>
    {
        var gastos = relatorio.Mes.GastosPorCategoria;
        if (gastos.Count == 0)
        {
            c.Item().Text("Nenhum gasto no mês.").FontColor(CoresDoRelatorio.TextoSuave);
            return;
        }

        var maximo = gastos.Max(g => g.Valor);
        var total = gastos.Sum(g => g.Valor);
        c.Item().Table(t =>
        {
            t.ColumnsDefinition(colunas =>
            {
                colunas.RelativeColumn(3);
                colunas.RelativeColumn(4);
                colunas.RelativeColumn(2.4f);
                colunas.RelativeColumn(1.2f);
                colunas.RelativeColumn(1.6f);
            });
            t.Header(h =>
            {
                h.Cell().ColumnSpan(2).Element(Topo).Text("Categoria");
                h.Cell().Element(Topo).AlignRight().Text("Valor");
                h.Cell().Element(Topo).AlignRight().Text("Parte");
                h.Cell().Element(Topo).AlignRight().Text(relatorio.Anterior is { } a ? $"vs. {MesCurto(a.Mes)}" : "");
            });
            foreach (var (gasto, indice) in gastos.Select((g, i) => (g, i)))
            {
                var antes = relatorio.Anterior?.GastosPorCategoria.FirstOrDefault(g => g.Categoria == gasto.Categoria)?.Valor;
                var variacao = Relatorio.Variacao(gasto.Valor, antes);
                t.Cell().Element(Linha).Text(gasto.Categoria);
                t.Cell().Element(Linha).AlignMiddle().PaddingRight(8)
                    .Element(e => Barra(e, gasto.Valor, maximo, CoresDoRelatorio.Grafico[indice % CoresDoRelatorio.Grafico.Length]));
                t.Cell().Element(Linha).AlignRight().Text(Moeda(gasto.Valor)).SemiBold();
                t.Cell().Element(Linha).AlignRight().Text(Percentual(gasto.Valor / total)).FontColor(CoresDoRelatorio.TextoSuave);
                t.Cell().Element(Linha).AlignRight().Text(variacao is { } v ? PercentualComSinal(v) : "—")
                    .FontColor(variacao switch { > 0m => CoresDoRelatorio.Saida, < 0m => CoresDoRelatorio.Entrada, _ => CoresDoRelatorio.TextoSuave });
            }
        });
    });

    private static IContainer Topo(IContainer celula) => celula.PaddingBottom(4).DefaultTextStyle(t => t.FontSize(8).FontColor(CoresDoRelatorio.TextoSuave));

    private static IContainer Linha(IContainer celula) => celula.BorderTop(1).BorderColor(CoresDoRelatorio.Borda).PaddingVertical(4);

    private static void Investimentos(IContainer container, ResumoMensal mes, ResumoMensal inicio) =>
        Cartao(container, "Investimentos", c =>
        {
            c.Item().Row(r =>
            {
                r.Spacing(8);
                Indicador(r.RelativeItem(), "Aplicado no mês", Moeda(mes.Investimentos.Aplicado), CoresDoRelatorio.Texto);
                Indicador(r.RelativeItem(), "Resgatado no mês", Moeda(mes.Investimentos.Resgatado), CoresDoRelatorio.Texto);
                Indicador(r.RelativeItem(), $"Aplicado desde {MesCurto(inicio.Mes)}", Moeda(mes.Investimentos.AplicadoAcumulado), CoresDoRelatorio.Texto);
            });
            c.Item().Text("O extrato da conta não traz rendimentos: os valores são o que saiu e voltou da conta.")
                .FontSize(8).FontColor(CoresDoRelatorio.TextoSuave);
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
        Numero(container.Background(CoresDoRelatorio.Fundo).CornerRadius(8).Padding(10), rotulo, valor, cor, 12, null);

    private static void Destaque(IContainer container, string rotulo, string valor, string cor, string? comparacao) =>
        Numero(container.Background(CoresDoRelatorio.Superficie).Border(1).BorderColor(CoresDoRelatorio.Borda).CornerRadius(12).Padding(12),
            rotulo, valor, cor, 14, comparacao);

    private static void Numero(IContainer container, string rotulo, string valor, string cor, float tamanho, string? comparacao) =>
        container.Column(c =>
        {
            c.Item().Text(rotulo).FontSize(8).FontColor(CoresDoRelatorio.TextoSuave);
            c.Item().Text(valor).FontSize(tamanho).SemiBold().FontColor(cor);
            if (comparacao is not null)
            {
                c.Item().Text(comparacao).FontSize(8).FontColor(CoresDoRelatorio.TextoSuave);
            }
        });

    /// <summary>Barra proporcional ao maior valor. O número vem escrito ao lado, para não depender só da barra.</summary>
    private static void Barra(IContainer container, decimal valor, decimal maximo, string cor)
    {
        var proporcao = maximo > 0m ? (float)(valor / maximo) : 0f;
        container.Row(trilho =>
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
    }
}

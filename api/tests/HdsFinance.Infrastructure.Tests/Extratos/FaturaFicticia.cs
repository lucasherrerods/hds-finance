using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Core;
using UglyToad.PdfPig.Fonts.Standard14Fonts;
using UglyToad.PdfPig.Writer;

namespace HdsFinance.Infrastructure.Tests.Extratos;

/// <summary>Um PDF inventado com o desenho da fatura do Inter, inclusive a coluna de valores desalinhada. Sem acentos, que a fonte padrão não escreve.</summary>
internal static class FaturaFicticia
{
    public static byte[] Montar(string valorDaPrimeira = "R$ 30,00", double desalinho = 5)
    {
        var pdf = new PdfDocumentBuilder();
        var fonte = pdf.AddStandard14Font(Standard14Font.Helvetica);

        var capa = pdf.AddPage(PageSize.A4);
        Escrever(capa, 800, (50, "Data de Vencimento"));
        Escrever(capa, 780, (50, "02/11/2026"));

        var resumo = pdf.AddPage(PageSize.A4);
        Escrever(resumo, 800, (50, "Descritivo detalhado"), (400, "R$ 1.100,00"));
        Escrever(resumo, 780, (50, "Despesas do mes"), (400, "R$ 0,00"));
        Escrever(resumo, 760, (50, "Valor antecipado"), (400, "R$ 50,00"));
        Escrever(resumo, 740, (50, "Fatura atual"), (400, "R$ 1.050,00"));

        var compras = pdf.AddPage(PageSize.A4);
        Escrever(compras, 820, (50, "FULANO DE TAL"), (300, "02/11/2026"), (400, "R$ 1.050,00"));
        Escrever(compras, 800, (50, "Despesas da fatura"));
        Escrever(compras, 780, (50, "CARTAO 1234****5678"));
        Escrever(compras, 760, (50, "Data"), (150, "Movimentacao"), (350, "Beneficiario"), (450, "Valor"));
        Compra(740, "09 de jul. 2026", "LOJA *Exemplo (Parcela 03 de 12)", valorDaPrimeira);
        Compra(720, "13 de set. 2026", "LANCHE FICTICIO", "R$ 1.070,00");
        Compra(700, "15 de set. 2026", "PAGTO DEBITO AUTOMATICO", "+ R$ 200,00");

        var segunda = pdf.AddPage(PageSize.A4);
        compras = segunda;
        Escrever(segunda, 820, (50, "FULANO DE TAL"), (300, "02/11/2026"), (400, "R$ 1.050,00"));
        Compra(780, "20 de set. 2026", "LOJA ESTORNO", "+ R$ 10,00");
        Compra(760, "01 de out. 2026", "PAGAMENTO ON LINE", "+ R$ 40,00");
        Escrever(segunda, 740, (50, "Total CARTAO 1234****5678"));
        Escrever(segunda, 740 - desalinho, (450, "R$ 1.100,00"));
        Escrever(segunda, 700, (300, "Proxima fatura"));
        Escrever(segunda, 680, (50, "LOJA *Exemplo (Parcela 04 de 12)"), (450, "R$ 30,00"));
        return pdf.Build();

        void Compra(double y, string data, string descricao, string valor)
        {
            Escrever(compras, y, (50, data), (150, descricao));
            Escrever(compras, y - desalinho, (400, "-"), (450, valor));
        }

        void Escrever(PdfPageBuilder pagina, double y, params (double X, string Texto)[] partes)
        {
            foreach (var (x, texto) in partes)
            {
                pagina.AddText(texto, 9, new PdfPoint(x, y), fonte);
            }
        }
    }
}

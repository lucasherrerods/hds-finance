using FluentAssertions;
using HdsFinance.Application.Admin;
using HdsFinance.Infrastructure.Extratos;
using QuestPDF.Fluent;

namespace HdsFinance.Infrastructure.Tests.Extratos;

public class LeitorFaturaInterPdfTestes
{
    private readonly LeitorFaturaInterPdf _leitor = new();

    [Theory]
    [InlineData(0)]
    [InlineData(5)]
    public void Le_as_compras_com_a_coluna_de_valores_alinhada_ou_nao(double desalinho)
    {
        var fatura = _leitor.Ler(FaturaFicticia.Montar(desalinho: desalinho), null)
            .Should().BeOfType<ResultadoDaLeituraDeFatura.Lida>().Subject.Fatura;

        fatura.Vencimento.Should().Be(new DateOnly(2026, 11, 2));
        fatura.Total.Should().Be(1050m);
        fatura.Cartoes.Should().ContainSingle().Which.Linhas.Select(l => (l.Data.ToString("yyyy-MM-dd"), l.Descricao, l.Valor)).Should().Equal(
            ("2026-07-09", "LOJA *Exemplo (Parcela 03 de 12)", -30m),
            ("2026-09-13", "LANCHE FICTICIO", -1070m),
            ("2026-09-15", "PAGTO DEBITO AUTOMATICO", 200m),
            ("2026-09-20", "LOJA ESTORNO", 10m),
            ("2026-10-01", "PAGAMENTO ON LINE", 40m));
        fatura.Confere().Should().BeTrue();
    }

    [Fact]
    public void Valor_que_nao_bate_com_o_total_nao_passa_na_conferencia()
    {
        var leitura = (ResultadoDaLeituraDeFatura.Lida)_leitor.Ler(FaturaFicticia.Montar("R$ 31,00"), null);

        leitura.Fatura.Confere().Should().BeFalse();
    }

    [Fact]
    public void Compra_sem_valor_e_recusada()
    {
        _leitor.Ler(FaturaFicticia.Montar("sem valor"), null).Should().BeOfType<ResultadoDaLeituraDeFatura.Invalida>();
    }

    [Fact]
    public void Com_senha_so_abre_com_a_senha_certa()
    {
        var protegida = Proteger(FaturaFicticia.Montar(), "segredo");

        _leitor.Ler(protegida, null).Should().BeOfType<ResultadoDaLeituraDeFatura.SenhaNecessaria>();
        _leitor.Ler(protegida, "errada").Should().BeOfType<ResultadoDaLeituraDeFatura.SenhaNecessaria>();
        _leitor.Ler(protegida, "segredo").Should().BeOfType<ResultadoDaLeituraDeFatura.Lida>();
    }

    [Fact]
    public void Arquivo_que_nao_e_pdf_e_recusado_sem_citar_o_conteudo()
    {
        _leitor.Ler("isto nao e pdf"u8.ToArray(), null)
            .Should().BeOfType<ResultadoDaLeituraDeFatura.Invalida>().Which.Motivo.Should().NotContain("isto");
    }

    private static byte[] Proteger(byte[] pdf, string senha)
    {
        var pasta = Directory.CreateTempSubdirectory("fatura-ficticia-");
        try
        {
            var (entrada, saida) = (Path.Combine(pasta.FullName, "a.pdf"), Path.Combine(pasta.FullName, "b.pdf"));
            File.WriteAllBytes(entrada, pdf);
            DocumentOperation.LoadFile(entrada)
                .Encrypt(new DocumentOperation.Encryption256Bit { UserPassword = senha, OwnerPassword = "dono" })
                .Save(saida);
            return File.ReadAllBytes(saida);
        }
        finally
        {
            pasta.Delete(recursive: true);
        }
    }
}

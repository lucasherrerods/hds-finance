using FluentAssertions;
using HdsFinance.Application.Extratos;
using HdsFinance.Infrastructure.Extratos;

namespace HdsFinance.Infrastructure.Tests.Extratos;

/// <summary>Até que dia o extrato cobre: é o que diz se um mês já está completo.</summary>
public class CoberturaDoExtratoTestes
{
    private static async Task<DateOnly?> CobertoAte(ILeitorDeExtrato leitor, Stream arquivo) =>
        ((ResultadoDaLeitura.Sucesso)await leitor.LerAsync(arquivo)).CobertoAte;

    [Fact]
    public async Task No_ofx_vem_do_dtend()
    {
        (await CobertoAte(new LeitorOfx(), Amostras.Abrir("inter-extrato.ofx"))).Should().Be(new DateOnly(2026, 10, 31));
    }

    [Fact]
    public async Task No_ofx_sem_dtend_e_a_data_da_ultima_transacao()
    {
        const string ofx = "<OFX><STMTTRN><DTPOSTED>20261002</DTPOSTED><TRNAMT>-10.50</TRNAMT><FITID>X1</FITID></STMTTRN>"
            + "<STMTTRN><DTPOSTED>20261015</DTPOSTED><TRNAMT>-1</TRNAMT><FITID>X2</FITID></STMTTRN></OFX>";

        (await CobertoAte(new LeitorOfx(), Amostras.DeTexto(ofx))).Should().Be(new DateOnly(2026, 10, 15));
    }

    [Fact]
    public async Task No_csv_vem_da_linha_do_periodo()
    {
        (await CobertoAte(new LeitorCsvInter(), Amostras.Abrir("inter-extrato.csv"))).Should().Be(new DateOnly(2026, 10, 31));
    }

    [Fact]
    public async Task No_csv_sem_periodo_e_a_data_da_ultima_transacao()
    {
        const string csv = "Data Lançamento;Histórico;Descrição;Valor;Saldo\n03/10/2026;Pix;A;10,00;10,00\n20/10/2026;Pix;B;5,00;15,00";

        (await CobertoAte(new LeitorCsvInter(), Amostras.DeTexto(csv))).Should().Be(new DateOnly(2026, 10, 20));
    }
}

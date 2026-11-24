using System.Text;
using FluentAssertions;
using HdsFinance.Application.Admin;
using HdsFinance.Application.Extratos;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Extratos;

namespace HdsFinance.Infrastructure.Tests.Extratos;

public class LeitoresNubankTestes
{
    private static Stream Texto(string texto) => new MemoryStream(Encoding.UTF8.GetBytes(texto));

    private static async Task<ResultadoDaLeitura> LerContaAsync(string? texto = null)
    {
        await using var conteudo = texto is null ? File.OpenRead(Path.Combine(AppContext.BaseDirectory, "samples", "nubank-conta.csv")) : Texto(texto);
        return await new LeitorCsvPorBanco().LerAsync(conteudo);
    }

    [Fact]
    public async Task Le_a_conta_sem_guardar_documento_agencia_e_conta_de_ninguem()
    {
        var lida = (await LerContaAsync()).Should().BeOfType<ResultadoDaLeitura.Sucesso>().Subject;

        lida.Banco.Should().Be(Banco.Nubank);
        lida.SaldoFinal.Should().BeNull();
        lida.Transacoes.Should().HaveCount(5).And.OnlyContain(t => t.Banco == Banco.Nubank);
        lida.Transacoes.Select(t => (t.Valor, t.Descricao)).Should().Equal(
            (400m, "Depósito Recebido por Boleto"),
            (-25m, "Transferência enviada pelo Pix - FULANA DE TAL - BANCO INTER (0077)"),
            (-10.90m, "Compra no débito - Farmácia Exemplo"),
            (-31.90m, "Transferência enviada pelo Pix - LOJA, EXEMPLO - NU PAGAMENTOS - IP (0260)"),
            (-50m, "Aplicação RDB"));
    }

    [Fact]
    public async Task O_mesmo_arquivo_da_as_mesmas_chaves()
    {
        var chaves = async () => ((ResultadoDaLeitura.Sucesso)await LerContaAsync()).Transacoes.Select(t => t.ChaveDeDeduplicacao).ToList();

        (await chaves()).Should().OnlyHaveUniqueItems().And.Equal(await chaves());
    }

    [Theory]
    [InlineData("Data,Valor,Identificador,Descrição\n99/99/2023,1.00,x,y", 2)]
    [InlineData("Data,Valor,Identificador,Descrição\n01/01/2023,abc,x,y", 2)]
    [InlineData("Data,Valor,Identificador,Descrição\n01/01/2023,1.00", 2)]
    public async Task Linha_invalida_diz_so_o_numero(string texto, int linha)
    {
        (await LerContaAsync(texto)).Should().BeOfType<ResultadoDaLeitura.Falha>().Which.Linha.Should().Be(linha);
    }

    [Fact]
    public async Task O_csv_do_inter_continua_lido()
    {
        await using var conteudo = File.OpenRead(Path.Combine(AppContext.BaseDirectory, "samples", "inter-extrato.csv"));

        (await new LeitorCsvPorBanco().LerAsync(conteudo)).Should().BeOfType<ResultadoDaLeitura.Sucesso>().Which.Banco.Should().Be(Banco.Inter);
    }

    [Theory]
    [InlineData("<OFX><FI><ORG>NU PAGAMENTOS S.A.<FID>260</FI><STMTTRN><DTPOSTED>20230801<TRNAMT>1.00</STMTTRN></OFX>")]
    [InlineData("<OFX><CREDITCARDMSGSRSV1><CCSTMTRS><STMTTRN><DTPOSTED>20230801<TRNAMT>1.00</STMTTRN></CCSTMTRS></OFX>")]
    public async Task Ofx_do_nubank_ou_de_cartao_e_recusado_para_nao_virar_conta_do_inter(string texto)
    {
        (await new LeitorOfx().LerAsync(Texto(texto))).Should().BeOfType<ResultadoDaLeitura.Falha>();
    }

    private static ResultadoDaLeituraDeFatura LerFatura(string texto, string nome = "Nubank_2024-06-22.csv") =>
        new LeitorDeFaturas().Ler(Encoding.UTF8.GetBytes(texto), nome, null);

    [Fact]
    public void Le_a_fatura_com_o_vencimento_do_nome_do_arquivo()
    {
        var fatura = LerFatura("date,title,amount\n2024-05-31,Uber,\"12,99\"\n2024-05-23,\"Loja, Exemplo\",1234.56\n2024-05-20,Curso,\"1.000,50\"\n2024-05-15,Pagamento recebido,\"- 32,82\"\n")
            .Should().BeOfType<ResultadoDaLeituraDeFatura.Lida>().Subject.Fatura;

        fatura.Banco.Should().Be(Banco.Nubank);
        fatura.Vencimento.Should().Be(new DateOnly(2024, 6, 22));
        fatura.Cartoes.Single().Linhas.Select(l => (l.Descricao, l.Valor)).Should().Equal(
            ("Uber", -12.99m), ("Loja, Exemplo", -1234.56m), ("Curso", -1000.50m), ("Pagamento recebido", 32.82m));
    }

    [Fact]
    public void Aceita_o_desenho_antigo_com_a_coluna_de_categoria()
    {
        var fatura = ((ResultadoDaLeituraDeFatura.Lida)LerFatura("date,category,title,amount\n2022-05-31,transporte,Uber,12.99\n", "nubank-2022-06.csv")).Fatura;

        fatura.Cartoes.Single().Linhas.Single().Descricao.Should().Be("Uber");
        fatura.Vencimento.Should().Be(new DateOnly(2022, 6, 1));
    }

    [Fact]
    public void Sem_data_no_nome_ou_com_outro_cabecalho_e_recusada()
    {
        LerFatura("date,title,amount\n2024-05-31,Uber,1\n", "fatura.csv").Should().BeOfType<ResultadoDaLeituraDeFatura.Invalida>();
        LerFatura("a,b,c\n").Should().BeOfType<ResultadoDaLeituraDeFatura.Invalida>();
        LerFatura("date,title,amount\nontem,Uber,1\n").Should().BeOfType<ResultadoDaLeituraDeFatura.Invalida>();
    }
}

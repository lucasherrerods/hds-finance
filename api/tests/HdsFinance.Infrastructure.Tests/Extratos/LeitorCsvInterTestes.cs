using FluentAssertions;
using HdsFinance.Application.Extratos;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Extratos;

namespace HdsFinance.Infrastructure.Tests.Extratos;

public class LeitorCsvInterTestes
{
    private readonly LeitorCsvInter _leitor = new();

    [Fact]
    public async Task Le_todas_as_transacoes_da_amostra()
    {
        await using var arquivo = Amostras.Abrir("inter-extrato.csv");

        var resultado = await _leitor.LerAsync(arquivo);

        var transacoes = resultado.Should().BeOfType<ResultadoDaLeitura.Sucesso>().Subject.Transacoes;
        transacoes.Should().BeEquivalentTo(
        [
            new Transacao(new DateOnly(2026, 10, 1), 3500.00m, "Pix recebido Fulano de Tal Ficticio", TipoDeTransacao.Comum),
            new Transacao(new DateOnly(2026, 10, 5), -123.45m, "Compra no debito Mercado Exemplo", TipoDeTransacao.Comum),
            new Transacao(new DateOnly(2026, 10, 10), -1000.00m, "Aplicação CDB Ficticio", TipoDeTransacao.Comum),
        ], o => o.WithStrictOrdering());
    }

    [Fact]
    public async Task Valor_invalido_informa_a_linha_sem_expor_o_conteudo()
    {
        const string csv = "Data Lançamento;Histórico;Descrição;Valor;Saldo\n01/10/2026;Pix;Fulano;xyz;0,00";

        var resultado = await _leitor.LerAsync(Amostras.DeTexto(csv));

        var falha = resultado.Should().BeOfType<ResultadoDaLeitura.Falha>().Subject;
        falha.Linha.Should().Be(2);
        falha.Motivo.Should().NotContain("xyz").And.NotContain("Fulano");
    }

    [Fact]
    public async Task Arquivo_sem_cabecalho_do_inter_e_falha()
    {
        var resultado = await _leitor.LerAsync(Amostras.DeTexto("a;b;c\n1;2;3"));

        resultado.Should().BeOfType<ResultadoDaLeitura.Falha>();
    }
}

public class LeitorCsvInterSaldoTestes
{
    private const string Cabecalho = "Data Lançamento;Histórico;Descrição;Valor;Saldo\n";

    private static async Task<decimal?> SaldoFinalDe(string csv) =>
        ((ResultadoDaLeitura.Sucesso)await new LeitorCsvInter().LerAsync(Amostras.DeTexto(Cabecalho + csv))).SaldoFinal;

    [Fact]
    public async Task Em_ordem_crescente_o_saldo_final_e_o_da_ultima_linha()
    {
        (await SaldoFinalDe("01/10/2026;A;x;100,00;600,00\n02/10/2026;B;y;-50,00;550,00")).Should().Be(550m);
    }

    [Fact]
    public async Task Em_ordem_decrescente_o_saldo_final_e_o_da_primeira_linha()
    {
        (await SaldoFinalDe("02/10/2026;B;y;-50,00;550,00\n01/10/2026;A;x;100,00;600,00")).Should().Be(550m);
    }

    [Fact]
    public async Task Saldos_que_nao_batem_deixam_o_saldo_desconhecido()
    {
        (await SaldoFinalDe("01/10/2026;A;x;100,00;600,00\n02/10/2026;B;y;-50,00;999,00")).Should().BeNull();
    }

    [Fact]
    public async Task Le_o_saldo_da_amostra()
    {
        await using var arquivo = Amostras.Abrir("inter-extrato.csv");

        var resultado = await new LeitorCsvInter().LerAsync(arquivo);

        ((ResultadoDaLeitura.Sucesso)resultado).SaldoFinal.Should().Be(2376.55m);
    }
}

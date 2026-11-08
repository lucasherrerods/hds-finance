using FluentAssertions;
using HdsFinance.Application.Extratos;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Extratos;

namespace HdsFinance.Infrastructure.Tests.Extratos;

public class LeitorOfxTestes
{
    private readonly LeitorOfx _leitor = new();

    [Fact]
    public async Task Le_todas_as_transacoes_da_amostra()
    {
        await using var arquivo = Amostras.Abrir("inter-extrato.ofx");

        var resultado = await _leitor.LerAsync(arquivo);

        var transacoes = resultado.Should().BeOfType<ResultadoDaLeitura.Sucesso>().Subject.Transacoes;
        transacoes.Should().BeEquivalentTo(
        [
            new Transacao(new DateOnly(2026, 10, 1), 3500.00m, "Salario Empresa Ficticia", TipoDeTransacao.Comum, "FICT-0001"),
            new Transacao(new DateOnly(2026, 10, 5), -123.45m, "Compra no debito Mercado Exemplo", TipoDeTransacao.Comum, "FICT-0002"),
            new Transacao(new DateOnly(2026, 10, 10), -1000.00m, "Aplicacao CDB Ficticio", TipoDeTransacao.Comum, "FICT-0003"),
        ], o => o.WithStrictOrdering());
    }

    [Fact]
    public async Task Aceita_tags_fechadas_no_estilo_xml()
    {
        const string ofx = "<OFX><STMTTRN><DTPOSTED>20261002</DTPOSTED><TRNAMT>-10.50</TRNAMT><FITID>X1</FITID><MEMO>Padaria</MEMO></STMTTRN></OFX>";

        var resultado = await _leitor.LerAsync(Amostras.DeTexto(ofx));

        resultado.Should().BeOfType<ResultadoDaLeitura.Sucesso>()
            .Which.Transacoes.Should().ContainSingle(t => t.Valor == -10.50m && t.Descricao == "Padaria");
    }

    [Fact]
    public async Task Valor_invalido_informa_a_linha_sem_expor_o_conteudo()
    {
        const string ofx = "<OFX>\n<STMTTRN>\n<DTPOSTED>20261002\n<TRNAMT>abc\n<FITID>X1\n</STMTTRN>\n</OFX>";

        var resultado = await _leitor.LerAsync(Amostras.DeTexto(ofx));

        var falha = resultado.Should().BeOfType<ResultadoDaLeitura.Falha>().Subject;
        falha.Linha.Should().Be(4);
        falha.Motivo.Should().NotContain("abc");
    }

    [Fact]
    public async Task Arquivo_sem_transacoes_e_falha()
    {
        var resultado = await _leitor.LerAsync(Amostras.DeTexto("isto não é um OFX"));

        resultado.Should().BeOfType<ResultadoDaLeitura.Falha>();
    }
}

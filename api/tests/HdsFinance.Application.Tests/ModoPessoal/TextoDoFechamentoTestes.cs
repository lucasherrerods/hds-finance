using FluentAssertions;
using HdsFinance.Application.ModoPessoal;
using HdsFinance.Domain;

namespace HdsFinance.Application.Tests.ModoPessoal;

public class TextoDoFechamentoTestes
{
    private static readonly MesDeReferencia Outubro = new(2026, 10);

    [Fact]
    public void Descreve_cada_resultado_sem_valores()
    {
        TextoDoFechamento.De(new ResultadoDoFechamento.Enviado(Outubro)).Should().Be("Fechamento de 2026-10 enviado por e-mail.");
        TextoDoFechamento.De(new ResultadoDoFechamento.JaEnviado(Outubro)).Should().Be("Fechamento de 2026-10 já tinha sido enviado.");
        TextoDoFechamento.De(new ResultadoDoFechamento.MesIncompleto(Outubro)).Should().Be("O mês 2026-10 ainda não está completo.");
        TextoDoFechamento.De(new ResultadoDoFechamento.SemDados(Outubro)).Should().Be("Nenhuma transação em 2026-10.");
        TextoDoFechamento.De(new ResultadoDoFechamento.FalhaNoEnvio(Outubro, "Serviço fora do ar."))
            .Should().Be("Falha ao enviar o fechamento de 2026-10: Serviço fora do ar.");
    }

    [Fact]
    public void Sem_fechamento_diz_que_nenhum_mes_completou()
    {
        TextoDoFechamento.De(null).Should().Be("Nenhum mês completo para fechar.");
    }
}

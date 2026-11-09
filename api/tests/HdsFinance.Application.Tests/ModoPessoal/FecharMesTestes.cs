using FluentAssertions;
using HdsFinance.Application.Extratos;
using HdsFinance.Application.ModoPessoal;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;

namespace HdsFinance.Application.Tests.ModoPessoal;

/// <summary>Registro em memória, para os testes não dependerem de banco.</summary>
internal sealed class RegistroFalso : IRegistroDoModoPessoal
{
    public List<(DateOnly? Ate, decimal? Saldo)> Extratos { get; } = [];

    public HashSet<MesDeReferencia> Enviados { get; } = [];

    public Task RegistrarExtratoAsync(DateOnly? cobertoAte, decimal? saldoFinal, CancellationToken cancelamento = default)
    {
        Extratos.Add((cobertoAte, saldoFinal));
        return Task.CompletedTask;
    }

    public Task<CoberturaDoHistorico> CoberturaAsync(CancellationToken cancelamento = default)
    {
        var ultimo = Extratos.Where(e => e.Ate is not null).OrderBy(e => e.Ate).LastOrDefault();
        return Task.FromResult(new CoberturaDoHistorico(ultimo.Ate, ultimo.Saldo));
    }

    public Task<bool> JaEnviadoAsync(MesDeReferencia mes, CancellationToken cancelamento = default) =>
        Task.FromResult(Enviados.Contains(mes));

    public Task MarcarEnviadoAsync(MesDeReferencia mes, DateTimeOffset quando, CancellationToken cancelamento = default)
    {
        Enviados.Add(mes);
        return Task.CompletedTask;
    }
}

public class FecharMesTestes
{
    private static readonly MesDeReferencia Outubro = new(2026, 10);

    private readonly RegistroFalso _registro = new();
    private readonly IRepositorioDeTransacoes _transacoes = Substitute.For<IRepositorioDeTransacoes>();
    private readonly INotificador _notificador = Substitute.For<INotificador>();
    private readonly FecharMes _fechar;

    public FecharMesTestes()
    {
        _transacoes.ListarAsync(Arg.Any<CancellationToken>()).Returns(
        [
            new Transacao(new DateOnly(2026, 9, 1), 3000m, "Salario", TipoDeTransacao.Comum),
            new Transacao(new DateOnly(2026, 10, 1), 3500m, "Salario", TipoDeTransacao.Comum),
            new Transacao(new DateOnly(2026, 10, 5), -120m, "Mercado", TipoDeTransacao.Comum),
        ]);
        _notificador.EnviarAsync(Arg.Any<MesDeReferencia>(), Arg.Any<byte[]>(), Arg.Any<CancellationToken>())
            .Returns(new ResultadoDoEnvio.Enviado());
        var gerador = Substitute.For<IGeradorDeRelatorio>();
        gerador.Gerar(Arg.Any<Relatorio>()).Returns([1, 2, 3]);
        var tempo = new FakeTimeProvider(new DateTimeOffset(2026, 11, 9, 10, 0, 0, TimeSpan.Zero));
        _fechar = new FecharMes(_transacoes, _registro, new GerarRelatorio(gerador, tempo), _notificador, tempo);
    }

    [Fact]
    public async Task Envia_o_mes_completo_e_marca_como_enviado()
    {
        await _registro.RegistrarExtratoAsync(new DateOnly(2026, 10, 31), 6380m);

        var resultado = await _fechar.EnviarAsync(Outubro);

        resultado.Should().Be(new ResultadoDoFechamento.Enviado(Outubro));
        _registro.Enviados.Should().Contain(Outubro);
        await _notificador.Received(1).EnviarAsync(Outubro, Arg.Any<byte[]>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Nao_envia_o_mesmo_mes_duas_vezes()
    {
        await _registro.RegistrarExtratoAsync(new DateOnly(2026, 10, 31), null);
        await _fechar.EnviarAsync(Outubro);

        var segunda = await _fechar.EnviarAsync(Outubro);

        segunda.Should().Be(new ResultadoDoFechamento.JaEnviado(Outubro));
        await _notificador.Received(1).EnviarAsync(Arg.Any<MesDeReferencia>(), Arg.Any<byte[]>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Forcado_reenvia_um_mes_ja_enviado()
    {
        await _registro.RegistrarExtratoAsync(new DateOnly(2026, 10, 31), null);
        await _fechar.EnviarAsync(Outubro);

        var forcado = await _fechar.EnviarAsync(Outubro, forcar: true);

        forcado.Should().Be(new ResultadoDoFechamento.Enviado(Outubro));
        await _notificador.Received(2).EnviarAsync(Outubro, Arg.Any<byte[]>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Mes_incompleto_nao_e_enviado()
    {
        await _registro.RegistrarExtratoAsync(new DateOnly(2026, 10, 20), null);

        var resultado = await _fechar.EnviarAsync(Outubro);

        resultado.Should().Be(new ResultadoDoFechamento.MesIncompleto(Outubro));
        await _notificador.DidNotReceiveWithAnyArgs().EnviarAsync(default, default!, default);
    }

    [Fact]
    public async Task Mes_sem_transacoes_nao_e_enviado()
    {
        await _registro.RegistrarExtratoAsync(new DateOnly(2026, 12, 31), null);

        var resultado = await _fechar.EnviarAsync(new MesDeReferencia(2026, 11));

        resultado.Should().Be(new ResultadoDoFechamento.SemDados(new MesDeReferencia(2026, 11)));
    }

    [Fact]
    public async Task Falha_no_envio_nao_marca_o_mes()
    {
        await _registro.RegistrarExtratoAsync(new DateOnly(2026, 10, 31), null);
        _notificador.EnviarAsync(Arg.Any<MesDeReferencia>(), Arg.Any<byte[]>(), Arg.Any<CancellationToken>())
            .Returns(new ResultadoDoEnvio.Falha("Serviço de e-mail fora do ar."));

        var resultado = await _fechar.EnviarAsync(Outubro);

        resultado.Should().Be(new ResultadoDoFechamento.FalhaNoEnvio(Outubro, "Serviço de e-mail fora do ar."));
        _registro.Enviados.Should().BeEmpty();
    }

    [Fact]
    public async Task Envia_so_o_ultimo_mes_completo()
    {
        await _registro.RegistrarExtratoAsync(new DateOnly(2026, 11, 12), null);

        var resultado = await _fechar.EnviarUltimoCompletoAsync();

        resultado.Should().Be(new ResultadoDoFechamento.Enviado(Outubro));
        await _notificador.Received(1).EnviarAsync(Arg.Any<MesDeReferencia>(), Arg.Any<byte[]>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Sem_extrato_nenhum_nao_ha_o_que_fechar()
    {
        (await _fechar.EnviarUltimoCompletoAsync()).Should().BeNull();
    }

    [Fact]
    public async Task O_saldo_do_ultimo_extrato_reconstroi_os_meses_anteriores()
    {
        await _registro.RegistrarExtratoAsync(new DateOnly(2026, 10, 31), 6380m);

        var meses = await _fechar.MesesAsync();

        meses.Select(m => (m.SaldoInicial, m.SaldoFinal)).Should().Equal((0m, 3000m), (3000m, 6380m));
    }

    [Fact]
    public async Task Gera_o_pdf_de_qualquer_mes_com_dados_mesmo_incompleto()
    {
        await _registro.RegistrarExtratoAsync(new DateOnly(2026, 10, 20), null);

        var resultado = await _fechar.GerarAsync(Outubro);

        resultado.Should().BeOfType<ResultadoDoRelatorio.Gerado>();
    }
}

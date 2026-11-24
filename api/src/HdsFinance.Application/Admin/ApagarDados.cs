using HdsFinance.Application.Extratos;
using HdsFinance.Domain;

namespace HdsFinance.Application.Admin;

public abstract record ResultadoDaRemocao
{
    public sealed record Apagado(int Quantidade) : ResultadoDaRemocao;

    public sealed record NaoEncontrado : ResultadoDaRemocao;
}

/// <summary>Na área admin, apaga do histórico uma transação ou um mês inteiro.</summary>
public sealed class ApagarDados(IRepositorioDeTransacoes repositorio)
{
    public async Task<ResultadoDaRemocao> TransacaoAsync(DateOnly data, decimal valor, string descricao, CancellationToken cancelamento = default) =>
        await repositorio.RemoverAsync(data, valor, descricao, cancelamento)
            ? new ResultadoDaRemocao.Apagado(1)
            : new ResultadoDaRemocao.NaoEncontrado();

    public async Task<ResultadoDaRemocao> MesAsync(MesDeReferencia mes, CancellationToken cancelamento = default) =>
        await repositorio.RemoverMesAsync(mes, cancelamento) is > 0 and var quantidade
            ? new ResultadoDaRemocao.Apagado(quantidade)
            : new ResultadoDaRemocao.NaoEncontrado();
}

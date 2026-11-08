using HdsFinance.Domain;

namespace HdsFinance.Application.Extratos;

public abstract record ResultadoDoResumo
{
    public sealed record Resumido(ResultadoDaImportacao.Importado Importacao, IReadOnlyList<ResumoMensal> Meses) : ResultadoDoResumo;

    public sealed record NaoImportado(ResultadoDaImportacao Motivo) : ResultadoDoResumo;
}

/// <summary>Importa o extrato no repositório recebido e devolve o resumo de cada mês que ele contém.</summary>
public sealed class ResumirExtrato(ImportarExtrato importar, IRepositorioDeTransacoes repositorio)
{
    public async Task<ResultadoDoResumo> ExecutarAsync(
        Stream conteudo, FormatoDeExtrato formato, CancellationToken cancelamento = default)
    {
        var importacao = await importar.ExecutarAsync(conteudo, formato, cancelamento);
        if (importacao is not ResultadoDaImportacao.Importado importado)
        {
            return new ResultadoDoResumo.NaoImportado(importacao);
        }

        var transacoes = await repositorio.ListarAsync(cancelamento);
        return new ResultadoDoResumo.Resumido(importado, ResumoMensal.PorMes(transacoes));
    }
}

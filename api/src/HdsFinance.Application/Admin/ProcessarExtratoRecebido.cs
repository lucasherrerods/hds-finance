using HdsFinance.Application.Extratos;

namespace HdsFinance.Application.Admin;

public sealed record ResultadoDoProcessamento(ResultadoDaImportacao Importacao, ResultadoDoFechamento? Fechamento);

/// <summary>O que acontece quando o admin inclui um extrato: importa, anota a cobertura e fecha o mês, se ele ficou completo.</summary>
public sealed class ProcessarExtratoRecebido(ImportarExtrato importar, IRegistroDoAdmin registro, FecharMes fechar)
{
    public async Task<ResultadoDoProcessamento> ExecutarAsync(
        Stream conteudo, FormatoDeExtrato formato, CancellationToken cancelamento = default)
    {
        var importacao = await importar.ExecutarAsync(conteudo, formato, cancelamento);
        if (importacao is not ResultadoDaImportacao.Importado importado)
        {
            return new ResultadoDoProcessamento(importacao, null);
        }

        await registro.RegistrarExtratoAsync(importado.CobertoAte, importado.SaldoFinal, cancelamento);
        return new ResultadoDoProcessamento(importacao, await fechar.EnviarUltimoCompletoAsync(cancelamento));
    }
}

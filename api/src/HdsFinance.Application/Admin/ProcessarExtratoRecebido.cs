using HdsFinance.Application.Extratos;
using HdsFinance.Domain;

namespace HdsFinance.Application.Admin;

public sealed record ResultadoDoProcessamento(ResultadoDaImportacao Importacao, ResultadoDoFechamento? Fechamento);

/// <summary>O que acontece quando o admin inclui um extrato: importa, anota a cobertura e fecha o mês, se ele ficou completo.</summary>
public sealed class ProcessarExtratoRecebido(ImportarExtrato importar, IRegistroDoAdmin registro, FecharMes fecharMes)
{
    public async Task<ResultadoDoProcessamento> ExecutarAsync(
        Stream conteudo, FormatoDeExtrato formato, CancellationToken cancelamento = default, bool fechar = true)
    {
        var importacao = await importar.ExecutarAsync(conteudo, formato, cancelamento);
        if (importacao is not ResultadoDaImportacao.Importado importado)
        {
            return new ResultadoDoProcessamento(importacao, null);
        }

        // Cobertura, saldo e fechamento são do Inter; os outros bancos só entram no histórico.
        if (importado.Banco != Banco.Inter)
        {
            return new ResultadoDoProcessamento(importacao, null);
        }

        await registro.RegistrarExtratoAsync(importado.CobertoAte, importado.SaldoFinal, cancelamento);
        // Num lote, só o último arquivo fecha: senão cada extrato mandaria o seu e-mail.
        return new ResultadoDoProcessamento(importacao, fechar ? await fecharMes.EnviarUltimoCompletoAsync(cancelamento) : null);
    }
}

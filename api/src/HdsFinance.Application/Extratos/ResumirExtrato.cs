using HdsFinance.Application.Admin;
using HdsFinance.Domain;

namespace HdsFinance.Application.Extratos;

/// <summary>O que a pessoa mudou numa transação do extrato que acabou de enviar.</summary>
public sealed record AjusteDoExtrato(string Chave, string? Categoria = null, bool Oculta = false);

public abstract record ResultadoDoResumo
{
    public sealed record Resumido(
        ResultadoDaImportacao.Importado Importacao,
        IReadOnlyList<ResumoMensal> Meses,
        PainelDoMes? Painel = null,
        IReadOnlyList<TransacaoCategorizada>? Transacoes = null) : ResultadoDoResumo
    {
        public IReadOnlyList<TransacaoCategorizada> Transacoes { get; init; } = Transacoes ?? [];

        /// <summary>As que dá para escolher numa transação.</summary>
        public IReadOnlyList<string> Categorias { get; init; } = [];
    }

    public sealed record NaoImportado(ResultadoDaImportacao Motivo) : ResultadoDoResumo;

    public sealed record AjusteInvalido : ResultadoDoResumo;
}

/// <summary>Importa o extrato no repositório recebido, aplica os ajustes da pessoa e devolve o resumo de cada mês que ele contém.</summary>
public sealed class ResumirExtrato(
    ImportarExtrato importar,
    IRepositorioDeTransacoes repositorio,
    Categorizador? categorizador = null)
{
    public async Task<ResultadoDoResumo> ExecutarAsync(
        Stream conteudo, FormatoDeExtrato formato, IReadOnlyList<AjusteDoExtrato>? ajustes = null, CancellationToken cancelamento = default)
    {
        var importacao = await importar.ExecutarAsync(conteudo, formato, cancelamento);
        if (importacao is not ResultadoDaImportacao.Importado importado)
        {
            return new ResultadoDoResumo.NaoImportado(importacao);
        }

        var regras = categorizador ?? Categorizador.Padrao;
        if (!await AplicarAsync(ajustes ?? [], new AjustarTransacao(repositorio, regras), cancelamento))
        {
            return new ResultadoDoResumo.AjusteInvalido();
        }

        var transacoes = await repositorio.ListarAsync(cancelamento);
        return new ResultadoDoResumo.Resumido(
            importado,
            ResumoMensal.PorMes(transacoes, importado.SaldoFinal, regras),
            PainelDoMes.Montar(transacoes, regras),
            TransacaoCategorizada.Listar(transacoes, regras))
        {
            Categorias = regras.Categorias,
        };
    }

    /// <summary>Uma transação que não está no extrato é ignorada; uma categoria que não existe recusa o pedido.</summary>
    private static async Task<bool> AplicarAsync(IReadOnlyList<AjusteDoExtrato> ajustes, AjustarTransacao ajustar, CancellationToken cancelamento)
    {
        foreach (var ajuste in ajustes)
        {
            if (ajuste.Categoria is not null
                && await ajustar.CategoriaAsync(ajuste.Chave, ajuste.Categoria, cancelamento) is ResultadoDoAjuste.CategoriaInvalida)
            {
                return false;
            }

            if (ajuste.Oculta)
            {
                await ajustar.OcultarAsync(ajuste.Chave, true, cancelamento);
            }
        }

        return true;
    }
}

using HdsFinance.Api.Demonstracao;
using HdsFinance.Application.ModoPessoal;

namespace HdsFinance.Api.Pessoal;

public sealed record HistoricoJson(IReadOnlyList<MesJson> Meses, PainelJson? Painel, IReadOnlyList<TransacaoJson> Transacoes);

/// <summary>Rotas que só existem no modo pessoal, rodando na máquina do dono.</summary>
public static class RotasDoModoPessoal
{
    public static void MapearModoPessoal(this IEndpointRouteBuilder app)
    {
        app.MapGet("/pessoal/historico", async (ConsultarHistorico consultar, CancellationToken cancelamento) =>
        {
            var historico = await consultar.ExecutarAsync(cancelamento);
            return Results.Ok(new HistoricoJson(
                historico.Meses.Select(JsonDoResumo.De).ToList(),
                historico.Painel is null ? null : JsonDoResumo.De(historico.Painel),
                historico.Transacoes.Select(JsonDoResumo.De).ToList()));
        });
    }
}

using HdsFinance.Application.Acesso;
using HdsFinance.Application.Admin;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace HdsFinance.Infrastructure.Notificacoes;

/// <summary>Envia fora da requisição. Falha vai para o log só com o motivo técnico, sem endereço nem conteúdo.</summary>
public sealed class EnvioEmSegundoPlano(IServiceScopeFactory escopos, ILogger<EnvioEmSegundoPlano> log) : IEnvioEmSegundoPlano
{
    public void EnviarCodigo(string para, string codigo) => _ = Task.Run(() => EnviarAsync(EmailDoCodigo.Montar(para, codigo)));

    private async Task EnviarAsync(EmailParaEnviar email)
    {
        try
        {
            await using var escopo = escopos.CreateAsyncScope();
            if (await escopo.ServiceProvider.GetRequiredService<IEnvioDeEmail>().EnviarAsync(email) is ResultadoDoEnvio.Falha falha)
            {
                log.LogWarning("Código de acesso não enviado: {Motivo}", falha.Motivo);
            }
        }
        catch (Exception erro)
        {
            log.LogWarning("Código de acesso não enviado: {Erro}", erro.GetType().Name);
        }
    }
}

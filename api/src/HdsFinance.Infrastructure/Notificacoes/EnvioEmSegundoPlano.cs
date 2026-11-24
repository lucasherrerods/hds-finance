using HdsFinance.Application.Acesso;
using HdsFinance.Application.Admin;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace HdsFinance.Infrastructure.Notificacoes;

/// <summary>Envia fora da requisição. Falha vai para o log só com o motivo técnico, sem endereço nem conteúdo.</summary>
public sealed class EnvioEmSegundoPlano(IServiceScopeFactory escopos, ILogger<EnvioEmSegundoPlano> log) : IEnvioEmSegundoPlano
{
    public void Enviar(EmailParaEnviar email) => _ = Task.Run(() => EnviarAsync(email));

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

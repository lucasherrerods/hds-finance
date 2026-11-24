using HdsFinance.Application.Acesso;
using HdsFinance.Application.Admin;

namespace HdsFinance.Application.Tests.Acesso;

/// <summary>Assina só marcando o texto: o suficiente para testar o fluxo sem criptografia.</summary>
internal sealed class AssinadorFalso : IAssinador
{
    public string Assinar(string conteudo) => $"ok:{conteudo}";

    public string? Abrir(string token) => token.StartsWith("ok:", StringComparison.Ordinal) ? token[3..] : null;

    public string Resumir(string texto) =>
        Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(texto)));
}

internal sealed class EnvioFalso : IEnvioDeEmail
{
    public List<EmailParaEnviar> Enviados { get; } = [];

    public ResultadoDoEnvio Resposta { get; set; } = new ResultadoDoEnvio.Enviado();

    public Task<ResultadoDoEnvio> EnviarAsync(EmailParaEnviar email, CancellationToken cancelamento = default)
    {
        Enviados.Add(email);
        return Task.FromResult(Resposta);
    }
}

internal sealed class EnvioEmSegundoPlanoFalso : IEnvioEmSegundoPlano
{
    public List<EmailParaEnviar> Enviados { get; } = [];

    public void Enviar(EmailParaEnviar email) => Enviados.Add(email);
}

internal sealed class CodigoFixo(string codigo) : IGeradorDeCodigo
{
    public string NovoCodigo() => codigo;
}

internal sealed class LimiteFalso : ILimiteDeEnvios
{
    public bool Liberado { get; set; } = true;

    public List<string> Chaves { get; } = [];

    public HashSet<string> Esgotadas { get; } = [];

    public bool Permitir(string chave, int maximo, TimeSpan janela)
    {
        Chaves.Add(chave);
        return Liberado && !Esgotadas.Contains(chave);
    }
}

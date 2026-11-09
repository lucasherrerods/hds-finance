using HdsFinance.Application.ModoPessoal;

namespace HdsFinance.Application.EmailDaDemo;

public sealed record AnexoDoEmail(string Nome, byte[] Conteudo);

public sealed record EmailParaEnviar(string Para, string Assunto, string Html, AnexoDoEmail? Anexo = null);

/// <summary>Porta: entrega um e-mail por um serviço transacional.</summary>
public interface IEnvioDeEmail
{
    Task<ResultadoDoEnvio> EnviarAsync(EmailParaEnviar email, CancellationToken cancelamento = default);
}

/// <summary>Porta: assina um texto para o navegador guardar, e confere a assinatura quando ele volta.</summary>
public interface IAssinador
{
    string Assinar(string conteudo);

    /// <summary>O conteúdo original, ou nulo se a assinatura não confere.</summary>
    string? Abrir(string token);

    /// <summary>Resumo com a chave do servidor: quem não tem a chave não consegue testar valores por força bruta.</summary>
    string Resumir(string texto);
}

public interface IGeradorDeCodigo
{
    string NovoCodigo();
}

/// <summary>Porta: conta envios por chave numa janela de tempo, só em memória.</summary>
public interface ILimiteDeEnvios
{
    bool Permitir(string chave, int maximo, TimeSpan janela);
}

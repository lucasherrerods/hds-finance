using System.Globalization;
using HdsFinance.Application.Admin;

namespace HdsFinance.Application.Acesso;

/// <summary>O único e-mail que pode entrar na área admin.</summary>
public sealed record ConfiguracaoDoAdmin(string Email);

public abstract record ResultadoDoPedidoDeCodigo
{
    /// <summary>O desafio volta para o navegador num cookie: o servidor não guarda o código.</summary>
    public sealed record CodigoEnviado(string Desafio) : ResultadoDoPedidoDeCodigo;

    public sealed record LimiteAtingido : ResultadoDoPedidoDeCodigo;

    public sealed record FalhaNoEnvio(string Motivo) : ResultadoDoPedidoDeCodigo;
}

public abstract record ResultadoDaConfirmacao
{
    public sealed record Confirmado(string Sessao) : ResultadoDaConfirmacao;

    public sealed record CodigoInvalido : ResultadoDaConfirmacao;

    public sealed record Expirado : ResultadoDaConfirmacao;

    public sealed record TentativasEsgotadas : ResultadoDaConfirmacao;
}

/// <summary>
/// Login da área admin por código enviado ao e-mail do admin. Desafio e sessão são tokens assinados
/// que ficam no navegador; o servidor não guarda sessão nem código.
/// </summary>
public sealed class AcessoDoAdmin(
    ConfiguracaoDoAdmin configuracao, IEnvioDeEmail envio, IAssinador assinador, IGeradorDeCodigo gerador, ILimiteDeEnvios limite, TimeProvider tempo)
{
    public static readonly TimeSpan ValidadeDoCodigo = TimeSpan.FromMinutes(10);
    public static readonly TimeSpan ValidadeDaSessao = TimeSpan.FromDays(7);
    private const int CodigosPorHora = 5;
    private const int TentativasPorDesafio = 5;

    private string EmailDoAdmin => Normalizar(configuracao.Email);

    /// <summary>
    /// Qualquer e-mail recebe a mesma resposta, para a tela não revelar qual é o do admin.
    /// Só o do admin recebe o código de verdade.
    /// </summary>
    public async Task<ResultadoDoPedidoDeCodigo> PedirCodigoAsync(string email, CancellationToken cancelamento = default)
    {
        var endereco = Normalizar(email);
        if (!limite.Permitir($"codigo:{assinador.Resumir(endereco)}", CodigosPorHora, TimeSpan.FromHours(1)))
        {
            return new ResultadoDoPedidoDeCodigo.LimiteAtingido();
        }

        var codigo = gerador.NovoCodigo();
        if (endereco == EmailDoAdmin)
        {
            var enviado = await envio.EnviarAsync(
                new EmailParaEnviar(endereco, $"Seu código de acesso ao hds finance: {codigo}",
                    $"<p>Use o código <strong>{codigo}</strong> para entrar na área admin do hds finance. Ele vale por 10 minutos.</p>"),
                cancelamento);
            if (enviado is ResultadoDoEnvio.Falha falha)
            {
                return new ResultadoDoPedidoDeCodigo.FalhaNoEnvio(falha.Motivo);
            }
        }

        var expira = tempo.GetUtcNow().Add(ValidadeDoCodigo).ToUnixTimeSeconds();
        return new ResultadoDoPedidoDeCodigo.CodigoEnviado(
            assinador.Assinar(string.Join('|', "desafio", assinador.Resumir($"{endereco}|{codigo}"), expira)));
    }

    public ResultadoDaConfirmacao Confirmar(string codigo, string desafio)
    {
        if (!limite.Permitir($"tentativa:{assinador.Resumir(desafio)}", TentativasPorDesafio, ValidadeDoCodigo))
        {
            return new ResultadoDaConfirmacao.TentativasEsgotadas();
        }

        if (Ler(desafio, "desafio") is not { } partes || partes.Valor != assinador.Resumir($"{EmailDoAdmin}|{codigo.Trim()}"))
        {
            return new ResultadoDaConfirmacao.CodigoInvalido();
        }

        if (partes.Expira < tempo.GetUtcNow())
        {
            return new ResultadoDaConfirmacao.Expirado();
        }

        var expira = tempo.GetUtcNow().Add(ValidadeDaSessao).ToUnixTimeSeconds();
        return new ResultadoDaConfirmacao.Confirmado(assinador.Assinar(string.Join('|', "sessao", assinador.Resumir(EmailDoAdmin), expira)));
    }

    /// <summary>Trocar o e-mail do admin na configuração invalida as sessões abertas.</summary>
    public bool SessaoValida(string sessao) =>
        Ler(sessao, "sessao") is { } partes
        && partes.Valor == assinador.Resumir(EmailDoAdmin)
        && partes.Expira >= tempo.GetUtcNow();

    private static string Normalizar(string email) => email.Trim().ToLowerInvariant();

    private (string Valor, DateTimeOffset Expira)? Ler(string token, string tipo)
    {
        var partes = assinador.Abrir(token)?.Split('|');
        return partes is [var t, var valor, var expira] && t == tipo
            && long.TryParse(expira, NumberStyles.None, CultureInfo.InvariantCulture, out var segundos)
                ? (valor, DateTimeOffset.FromUnixTimeSeconds(segundos))
                : null;
    }
}

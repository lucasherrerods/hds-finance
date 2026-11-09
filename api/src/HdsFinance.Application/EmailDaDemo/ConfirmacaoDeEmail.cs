using System.Globalization;
using System.Text.RegularExpressions;
using HdsFinance.Application.ModoPessoal;

namespace HdsFinance.Application.EmailDaDemo;

public abstract record ResultadoDoPedidoDeCodigo
{
    /// <summary>O desafio volta para o navegador: o servidor não guarda o código.</summary>
    public sealed record CodigoEnviado(string Desafio) : ResultadoDoPedidoDeCodigo;

    public sealed record EmailInvalido : ResultadoDoPedidoDeCodigo;

    public sealed record LimiteAtingido : ResultadoDoPedidoDeCodigo;

    public sealed record FalhaNoEnvio(string Motivo) : ResultadoDoPedidoDeCodigo;
}

public abstract record ResultadoDaConfirmacao
{
    public sealed record Confirmado(string Token) : ResultadoDaConfirmacao;

    public sealed record CodigoInvalido : ResultadoDaConfirmacao;

    public sealed record Expirado : ResultadoDaConfirmacao;
}

/// <summary>
/// Confirma que a pessoa tem acesso ao e-mail sem o servidor guardar nada: o código vai por e-mail,
/// e o desafio e o token de confirmação ficam no navegador, assinados. Dentro deles só há hashes.
/// </summary>
public sealed partial class ConfirmacaoDeEmail(
    IEnvioDeEmail envio, IAssinador assinador, IGeradorDeCodigo gerador, ILimiteDeEnvios limite, TimeProvider tempo)
{
    public static readonly TimeSpan ValidadeDoCodigo = TimeSpan.FromMinutes(10);
    public static readonly TimeSpan ValidadeDaConfirmacao = TimeSpan.FromDays(30);
    private const int CodigosPorHora = 3;

    public async Task<ResultadoDoPedidoDeCodigo> PedirCodigoAsync(string email, CancellationToken cancelamento = default)
    {
        var endereco = Normalizar(email);
        if (!FormatoDeEmail().IsMatch(endereco))
        {
            return new ResultadoDoPedidoDeCodigo.EmailInvalido();
        }

        if (!limite.Permitir($"codigo:{Chave(endereco)}", CodigosPorHora, TimeSpan.FromHours(1)))
        {
            return new ResultadoDoPedidoDeCodigo.LimiteAtingido();
        }

        var codigo = gerador.NovoCodigo();
        var enviado = await envio.EnviarAsync(
            new EmailParaEnviar(endereco, $"Seu código do hds finance: {codigo}",
                $"<p>Use o código <strong>{codigo}</strong> para confirmar este e-mail no hds finance. Ele vale por 10 minutos.</p>"),
            cancelamento);
        if (enviado is ResultadoDoEnvio.Falha falha)
        {
            return new ResultadoDoPedidoDeCodigo.FalhaNoEnvio(falha.Motivo);
        }

        var expira = tempo.GetUtcNow().Add(ValidadeDoCodigo).ToUnixTimeSeconds();
        return new ResultadoDoPedidoDeCodigo.CodigoEnviado(
            assinador.Assinar(string.Join('|', "desafio", assinador.Resumir($"{endereco}|{codigo}"), expira)));
    }

    public ResultadoDaConfirmacao Confirmar(string email, string codigo, string desafio)
    {
        var endereco = Normalizar(email);
        if (Ler(desafio, "desafio") is not { } partes || partes.Valor != assinador.Resumir($"{endereco}|{codigo.Trim()}"))
        {
            return new ResultadoDaConfirmacao.CodigoInvalido();
        }

        if (partes.Expira < tempo.GetUtcNow())
        {
            return new ResultadoDaConfirmacao.Expirado();
        }

        var expira = tempo.GetUtcNow().Add(ValidadeDaConfirmacao).ToUnixTimeSeconds();
        return new ResultadoDaConfirmacao.Confirmado(assinador.Assinar(string.Join('|', "confirmado", Chave(endereco), expira)));
    }

    public bool EstaConfirmado(string email, string token) =>
        Ler(token, "confirmado") is { } partes
        && partes.Valor == Chave(Normalizar(email))
        && partes.Expira >= tempo.GetUtcNow();

    /// <summary>Identifica o endereço nos limites e no token sem carregar o endereço.</summary>
    public string Chave(string email) => assinador.Resumir(Normalizar(email));

    public static string Normalizar(string email) => email.Trim().ToLowerInvariant();

    private (string Valor, DateTimeOffset Expira)? Ler(string token, string tipo)
    {
        var partes = assinador.Abrir(token)?.Split('|');
        return partes is [var t, var valor, var expira] && t == tipo
            && long.TryParse(expira, NumberStyles.None, CultureInfo.InvariantCulture, out var segundos)
                ? (valor, DateTimeOffset.FromUnixTimeSeconds(segundos))
                : null;
    }

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex FormatoDeEmail();
}

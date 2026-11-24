using System.Globalization;

namespace HdsFinance.Application.Acesso;

/// <summary>O único e-mail que pode entrar na área admin.</summary>
public sealed record ConfiguracaoDoAdmin(string Email);

public abstract record ResultadoDoPedidoDeCodigo
{
    /// <summary>O desafio volta para o navegador num cookie: o servidor não guarda o código.</summary>
    public sealed record CodigoEnviado(string Desafio) : ResultadoDoPedidoDeCodigo;

    public sealed record LimiteAtingido : ResultadoDoPedidoDeCodigo;
}

public abstract record ResultadoDaConfirmacao
{
    public sealed record Confirmado(string Sessao, string Dispositivo) : ResultadoDaConfirmacao;

    public sealed record CodigoInvalido : ResultadoDaConfirmacao;

    public sealed record Expirado : ResultadoDaConfirmacao;

    public sealed record TentativasEsgotadas : ResultadoDaConfirmacao;
}

/// <summary>
/// Login da área admin por código enviado ao e-mail do admin. Desafio e sessão são tokens assinados
/// que ficam no navegador; o servidor não guarda sessão nem código.
/// </summary>
public sealed class AcessoDoAdmin(
    ConfiguracaoDoAdmin configuracao, IEnvioEmSegundoPlano envio, IAssinador assinador, IGeradorDeCodigo gerador, ILimiteDeEnvios limite, TimeProvider tempo)
{
    public static readonly TimeSpan ValidadeDoCodigo = TimeSpan.FromMinutes(10);
    public static readonly TimeSpan ValidadeDaSessao = TimeSpan.FromDays(7);
    public static readonly TimeSpan ValidadeDoDispositivo = TimeSpan.FromDays(180);
    private const int CodigosPorHora = 5;
    private const int EnviosPorHora = 20;
    private const int TentativasPorDesafio = 5;

    private string EmailDoAdmin => Normalizar(configuracao.Email);

    /// <summary>
    /// Qualquer e-mail recebe a mesma resposta, no mesmo tempo: o envio sai em segundo plano e só para o admin.
    /// O limite é por origem, e o navegador que já entrou tem o próprio: um curioso não bloqueia o admin.
    /// </summary>
    public ResultadoDoPedidoDeCodigo PedirCodigo(string email, string origem, string? dispositivo)
    {
        var conhecido = DispositivoConhecido(dispositivo);
        if (!limite.Permitir(conhecido ? $"dispositivo:{assinador.Resumir(dispositivo!)}" : $"codigo:{origem}", CodigosPorHora, TimeSpan.FromHours(1)))
        {
            return new ResultadoDoPedidoDeCodigo.LimiteAtingido();
        }

        var endereco = Normalizar(email);
        var codigo = gerador.NovoCodigo();

        // O teto protege a cota do serviço de e-mail; o navegador conhecido já tem o limite dele.
        if (endereco == EmailDoAdmin && (conhecido || limite.Permitir("envios", EnviosPorHora, TimeSpan.FromHours(1))))
        {
            envio.Enviar(new EmailParaEnviar(endereco, $"Seu código de acesso ao hds finance: {codigo}",
                $"<p>Use o código <strong>{codigo}</strong> para entrar na área admin do hds finance. Ele vale por 10 minutos.</p>"));
        }

        var expira = tempo.GetUtcNow().Add(ValidadeDoCodigo).ToUnixTimeSeconds();
        return new ResultadoDoPedidoDeCodigo.CodigoEnviado(
            assinador.Assinar(string.Join('|', "desafio", assinador.Resumir($"{endereco}|{codigo}"), expira, Guid.NewGuid().ToString("N"))));
    }

    public ResultadoDaConfirmacao Confirmar(string codigo, string desafio)
    {
        // A assinatura vem antes do limite: desafio inventado não ocupa memória.
        if (Ler(desafio, "desafio") is not { } partes)
        {
            return new ResultadoDaConfirmacao.CodigoInvalido();
        }

        if (!limite.Permitir($"tentativa:{assinador.Resumir(desafio)}", TentativasPorDesafio, ValidadeDoCodigo))
        {
            return new ResultadoDaConfirmacao.TentativasEsgotadas();
        }

        if (partes.Valor != assinador.Resumir($"{EmailDoAdmin}|{codigo.Trim()}"))
        {
            return new ResultadoDaConfirmacao.CodigoInvalido();
        }

        if (partes.Expira < tempo.GetUtcNow())
        {
            return new ResultadoDaConfirmacao.Expirado();
        }

        return new ResultadoDaConfirmacao.Confirmado(Token("sessao", ValidadeDaSessao), Token("dispositivo", ValidadeDoDispositivo));
    }

    /// <summary>Trocar o e-mail do admin na configuração invalida as sessões abertas.</summary>
    public bool SessaoValida(string sessao) => TokenValido(sessao, "sessao");

    /// <summary>Só dá um limite de pedidos próprio: não abre sessão nem dispensa o código.</summary>
    public bool DispositivoConhecido(string? dispositivo) => dispositivo is not null && TokenValido(dispositivo, "dispositivo");

    private string Token(string tipo, TimeSpan validade) => assinador.Assinar(string.Join(
        '|', tipo, assinador.Resumir(EmailDoAdmin), tempo.GetUtcNow().Add(validade).ToUnixTimeSeconds(), Guid.NewGuid().ToString("N")));

    private bool TokenValido(string token, string tipo) =>
        Ler(token, tipo) is { } partes
        && partes.Valor == assinador.Resumir(EmailDoAdmin)
        && partes.Expira >= tempo.GetUtcNow();

    private static string Normalizar(string email) => email.Trim().ToLowerInvariant();

    private (string Valor, DateTimeOffset Expira)? Ler(string token, string tipo)
    {
        var partes = assinador.Abrir(token)?.Split('|');
        return partes is [var t, var valor, var expira, _] && t == tipo
            && long.TryParse(expira, NumberStyles.None, CultureInfo.InvariantCulture, out var segundos)
                ? (valor, DateTimeOffset.FromUnixTimeSeconds(segundos))
                : null;
    }
}

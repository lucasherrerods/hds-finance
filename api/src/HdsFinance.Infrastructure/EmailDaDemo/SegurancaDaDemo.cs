using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using HdsFinance.Application.EmailDaDemo;

namespace HdsFinance.Infrastructure.EmailDaDemo;

/// <summary>Assina com HMAC-SHA256. O token é "conteúdo.assinatura", os dois em base64url.</summary>
public sealed class AssinadorHmac : IAssinador
{
    private const int TamanhoMinimoDaChave = 32;
    private readonly byte[] _chave;

    public AssinadorHmac(string chave)
    {
        _chave = Encoding.UTF8.GetBytes(chave);
        if (_chave.Length < TamanhoMinimoDaChave)
        {
            throw new ArgumentException($"A chave de assinatura precisa de pelo menos {TamanhoMinimoDaChave} bytes.", nameof(chave));
        }
    }

    public string Assinar(string conteudo)
    {
        var bytes = Encoding.UTF8.GetBytes(conteudo);
        return $"{Base64Url(bytes)}.{Base64Url(HMACSHA256.HashData(_chave, bytes))}";
    }

    public string? Abrir(string token)
    {
        var partes = token.Split('.');
        if (partes.Length != 2 || !TentarDecodificar(partes[0], out var conteudo) || !TentarDecodificar(partes[1], out var assinatura))
        {
            return null;
        }

        return CryptographicOperations.FixedTimeEquals(assinatura, HMACSHA256.HashData(_chave, conteudo))
            ? Encoding.UTF8.GetString(conteudo)
            : null;
    }

    public string Resumir(string texto) =>
        Convert.ToHexStringLower(HMACSHA256.HashData(_chave, Encoding.UTF8.GetBytes($"resumo|{texto}")));

    private static string Base64Url(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static bool TentarDecodificar(string texto, out byte[] bytes)
    {
        var base64 = texto.Replace('-', '+').Replace('_', '/');
        base64 = base64.PadRight(base64.Length + (4 - base64.Length % 4) % 4, '=');
        bytes = new byte[base64.Length];
        if (texto.Length == 0 || !Convert.TryFromBase64String(base64, bytes, out var escritos))
        {
            bytes = [];
            return false;
        }

        bytes = bytes[..escritos];
        return true;
    }
}

public sealed class GeradorDeCodigoAleatorio : IGeradorDeCodigo
{
    public string NovoCodigo() => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("000000", System.Globalization.CultureInfo.InvariantCulture);
}

/// <summary>Janela deslizante só em memória: some quando a api reinicia e nunca guarda o endereço, só a chave resumida.</summary>
public sealed class LimiteDeEnviosEmMemoria(TimeProvider tempo) : ILimiteDeEnvios
{
    private readonly ConcurrentDictionary<string, Queue<DateTimeOffset>> _envios = new();

    public bool Permitir(string chave, int maximo, TimeSpan janela)
    {
        var agora = tempo.GetUtcNow();
        var fila = _envios.GetOrAdd(chave, _ => new Queue<DateTimeOffset>());
        lock (fila)
        {
            while (fila.Count > 0 && fila.Peek() <= agora - janela)
            {
                fila.Dequeue();
            }

            if (fila.Count >= maximo)
            {
                return false;
            }

            fila.Enqueue(agora);
            return true;
        }
    }
}

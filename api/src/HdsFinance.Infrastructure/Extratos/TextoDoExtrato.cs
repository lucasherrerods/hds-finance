using System.Text;

namespace HdsFinance.Infrastructure.Extratos;

internal static class TextoDoExtrato
{
    private static readonly UTF8Encoding Utf8Estrito = new(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);

    // O Inter exporta tanto em UTF-8 quanto em Windows-1252; Latin1 cobre os acentos do 1252.
    public static async Task<string> LerAsync(Stream conteudo, CancellationToken cancelamento)
    {
        using var memoria = new MemoryStream();
        await conteudo.CopyToAsync(memoria, cancelamento);
        var bytes = memoria.ToArray();

        try
        {
            return Utf8Estrito.GetString(bytes).TrimStart('﻿');
        }
        catch (DecoderFallbackException)
        {
            return Encoding.Latin1.GetString(bytes);
        }
    }

    public static int LinhaDaPosicao(string texto, int posicao) =>
        texto.AsSpan(0, posicao).Count('\n') + 1;
}

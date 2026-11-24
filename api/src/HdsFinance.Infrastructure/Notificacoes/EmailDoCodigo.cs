using HdsFinance.Application.Acesso;
using Cores = HdsFinance.Infrastructure.Relatorios.CoresDoRelatorio;

namespace HdsFinance.Infrastructure.Notificacoes;

/// <summary>O e-mail do código de acesso. Estilos na própria tag e tabelas, porque é o que os leitores de e-mail entendem.</summary>
public static class EmailDoCodigo
{
    public static EmailParaEnviar Montar(string para, string codigo) => new(para, "Código de acesso - hds finance", $"""
        <!doctype html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Código de acesso</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: {Cores.Fundo};">
          <div style="display: none; max-height: 0; overflow: hidden;">Seu código para entrar na área admin.</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="{Cores.Fundo}">
            <tr>
              <td align="center" style="padding: 32px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="{Cores.Superficie}" style="max-width: 560px; border: 1px solid {Cores.Borda}; border-radius: 16px; font-family: Inter, Arial, Helvetica, sans-serif; color: {Cores.Texto}; font-size: 16px; line-height: 1.6;">
                  <tr>
                    <td style="padding: 32px;">
                      <p style="margin: 0 0 24px; font-size: 18px; font-weight: bold; color: {Cores.Primaria};">hds finance</p>
                      <h1 style="margin: 0 0 8px; font-size: 24px; line-height: 1.2;">Olá!</h1>
                      <p style="margin: 0;">Use o código abaixo para entrar na área admin:</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                        <tr>
                          <td align="center" bgcolor="{Cores.PrimariaSuave}" style="padding: 24px 16px; border-radius: 12px; font-size: 32px; line-height: 1.2; font-weight: bold; letter-spacing: 8px; color: {Cores.Texto};">{codigo}</td>
                        </tr>
                      </table>
                      <p style="margin: 0; color: {Cores.TextoSuave};">⏳ Este código vale por <strong>10 minutos</strong>.</p>
                      <p style="margin: 24px 0 0; padding-top: 24px; border-top: 1px solid {Cores.Borda}; font-size: 14px; color: {Cores.TextoSuave};">Não pediu este código? Ignore este e-mail: sem ele, ninguém entra.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """);
}

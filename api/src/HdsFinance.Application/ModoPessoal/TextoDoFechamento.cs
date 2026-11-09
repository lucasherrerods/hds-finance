namespace HdsFinance.Application.ModoPessoal;

/// <summary>O resultado do fechamento em uma frase, para log e terminal. Nunca traz valores.</summary>
public static class TextoDoFechamento
{
    public static string De(ResultadoDoFechamento? resultado) => resultado switch
    {
        null => "Nenhum mês completo para fechar.",
        ResultadoDoFechamento.Enviado e => $"Fechamento de {e.Mes} enviado por e-mail.",
        ResultadoDoFechamento.JaEnviado j => $"Fechamento de {j.Mes} já tinha sido enviado.",
        ResultadoDoFechamento.MesIncompleto i => $"O mês {i.Mes} ainda não está completo.",
        ResultadoDoFechamento.SemDados s => $"Nenhuma transação em {s.Mes}.",
        ResultadoDoFechamento.FalhaNoEnvio f => $"Falha ao enviar o fechamento de {f.Mes}: {f.Motivo}",
        _ => resultado.ToString()!,
    };
}

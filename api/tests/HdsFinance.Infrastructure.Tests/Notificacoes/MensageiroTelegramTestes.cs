using System.Net;
using FluentAssertions;
using HdsFinance.Infrastructure.Notificacoes;
using Microsoft.Extensions.Options;

namespace HdsFinance.Infrastructure.Tests.Notificacoes;

public class MensageiroTelegramTestes
{
    private static readonly OpcoesDoTelegram Opcoes = new() { Token = "123:token-ficticio", ChatId = 42 };

    private static (MensageiroTelegram Mensageiro, ServidorFalso Servidor) Montar(HttpStatusCode status = HttpStatusCode.OK, OpcoesDoTelegram? opcoes = null)
    {
        var servidor = new ServidorFalso(status);
        var cliente = new HttpClient(servidor) { BaseAddress = new Uri(OpcoesDoTelegram.EnderecoPadrao) };
        return (new MensageiroTelegram(cliente, Options.Create(opcoes ?? Opcoes)), servidor);
    }

    [Fact]
    public async Task Manda_o_texto_so_para_o_chat_do_admin()
    {
        var (mensageiro, servidor) = Montar();

        (await mensageiro.EnviarTextoAsync("Olá")).Should().BeTrue();

        servidor.Requisicao!.RequestUri!.AbsolutePath.Should().Be("/bot123:token-ficticio/sendMessage");
        servidor.Corpo.Should().Contain("\"chat_id\":42").And.Contain("\"text\":\"Ol");
    }

    [Fact]
    public async Task Manda_o_pdf_como_documento()
    {
        var (mensageiro, servidor) = Montar();

        (await mensageiro.EnviarArquivoAsync("fechamento-2026-10.pdf", [1, 2, 3], "Fechamento")).Should().BeTrue();

        servidor.Requisicao!.RequestUri!.AbsolutePath.Should().EndWith("/sendDocument");
        servidor.Corpo.Should().Contain("fechamento-2026-10.pdf");
    }

    [Fact]
    public async Task Recusa_vira_falso() =>
        (await Montar(HttpStatusCode.Forbidden).Mensageiro.EnviarTextoAsync("x")).Should().BeFalse();

    [Fact]
    public async Task Sem_configuracao_nao_chama_o_telegram()
    {
        var (mensageiro, servidor) = Montar(opcoes: new OpcoesDoTelegram { Token = "x", ChatId = 0 });

        mensageiro.Configurado.Should().BeFalse();
        (await mensageiro.EnviarTextoAsync("x")).Should().BeFalse();
        servidor.Requisicao.Should().BeNull();
    }
}

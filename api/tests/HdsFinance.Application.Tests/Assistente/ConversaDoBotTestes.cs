using FluentAssertions;
using HdsFinance.Application.Assistente;

namespace HdsFinance.Application.Tests.Assistente;

public class ConversaDoBotTestes
{
    [Theory]
    [InlineData("/mes", "/mes", "")]
    [InlineData("/categoria@MeuBot  Lazer", "/categoria", "Lazer")]
    [InlineData("/AJUDA", "/ajuda", "")]
    [InlineData("quanto gastei?", "", "quanto gastei?")]
    public void Separa_comando_e_argumento(string texto, string comando, string argumento) =>
        ConversaDoBot.Separar(texto).Should().Be((comando, argumento));
}

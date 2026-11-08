using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace HdsFinance.Api.Tests;

public class SaudeTestes(WebApplicationFactory<Program> fabrica) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Rota_de_saude_responde_ok()
    {
        var resposta = await fabrica.CreateClient().GetAsync("/saude");

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}

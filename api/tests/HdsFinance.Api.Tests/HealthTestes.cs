using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace HdsFinance.Api.Tests;

public class HealthTestes(WebApplicationFactory<Program> fabrica) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Rota_de_health_responde_ok()
    {
        var resposta = await fabrica.CreateClient().GetAsync("/health");

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}

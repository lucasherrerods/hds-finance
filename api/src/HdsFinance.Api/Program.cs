using HdsFinance.Api.Demonstracao;
using HdsFinance.Api.Pessoal;
using HdsFinance.Infrastructure;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:OrigensPermitidas").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .WithMethods("GET", "POST", "PUT")));

// Na hospedagem, toda requisição chega pelo proxy dela. Sem isto, o limite por IP valeria para todo mundo junto.
// Fica desligado por padrão: sem proxy na frente, qualquer um poderia inventar o próprio IP no cabeçalho.
var confiarNoProxy = builder.Configuration.GetValue("Proxy:ConfiarNoEncaminhamento", false);
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});

builder.Services.AdicionarNucleo(builder.Configuration);
var modoPessoal = builder.Configuration["Modo"] == Composicao.ModoPessoal;
if (modoPessoal)
{
    builder.Services.AdicionarModoPessoal(builder.Configuration);
}
else
{
    builder.Services.AdicionarDemonstracao(builder.Configuration);
}

builder.Services.AdicionarLimitesDaDemonstracao(builder.Configuration);

var app = builder.Build();

if (modoPessoal)
{
    await app.Services.PrepararBancoAsync();
}

if (confiarNoProxy)
{
    app.UseForwardedHeaders();
}

app.UseExceptionHandler();
app.UseCors();
app.UseRateLimiter();
app.MapOpenApi();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapearDemonstracao(comEmail: !modoPessoal);
if (modoPessoal)
{
    app.MapearModoPessoal();
}

app.Run();

public partial class Program;

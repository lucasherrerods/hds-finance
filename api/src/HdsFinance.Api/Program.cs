using HdsFinance.Api.Admin;
using HdsFinance.Api.Demonstracao;
using HdsFinance.Infrastructure;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
// Credenciais liberadas só para as origens da lista: o cookie de sessão do admin precisa atravessar o CORS.
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:OrigensPermitidas").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowCredentials()
    .WithMethods("GET", "POST", "PUT", "DELETE")));

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
builder.Services.AdicionarDemonstracao(builder.Configuration);
var comAdmin = Composicao.AdminConfigurado(builder.Configuration);
if (comAdmin)
{
    builder.Services.AdicionarAdmin(builder.Configuration);
}

builder.Services.AdicionarLimitesDaDemonstracao(builder.Configuration);

var app = builder.Build();

if (comAdmin)
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
app.MapearDemonstracao();
if (comAdmin)
{
    app.MapearAdmin();
    app.MapearTelegram();
}

app.Run();

public partial class Program;

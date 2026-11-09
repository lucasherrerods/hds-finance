using HdsFinance.Api.Demonstracao;
using HdsFinance.Api.Pessoal;
using HdsFinance.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:OrigensPermitidas").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .WithMethods("GET", "POST", "PUT")));

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

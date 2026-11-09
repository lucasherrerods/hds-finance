using HdsFinance.Api.Demonstracao;
using HdsFinance.Application.Extratos;
using HdsFinance.Application.Relatorios;
using HdsFinance.Infrastructure.Relatorios;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Extratos;
using HdsFinance.Infrastructure.Repositorios;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:OrigensPermitidas").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .WithMethods("POST")));

// Modo demonstração: nada sobrevive à requisição.
builder.Services.AddSingleton<ILeitorDeExtrato, LeitorOfx>();
builder.Services.AddSingleton<ILeitorDeExtrato, LeitorCsvInter>();
builder.Services.AddSingleton(new ClassificadorDeTipo());
var regras = builder.Configuration.GetSection("Categorias").Get<List<RegraDeCategoria>>();
builder.Services.AddSingleton(regras is { Count: > 0 } ? new Categorizador(regras) : Categorizador.Padrao);
builder.Services.AddScoped<IRepositorioDeTransacoes, RepositorioEmMemoria>();
builder.Services.AddScoped<ImportarExtrato>();
builder.Services.AddScoped<ResumirExtrato>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IGeradorDeRelatorio, RelatorioQuestPdf>();
builder.Services.AddSingleton<GerarRelatorio>();
builder.Services.AdicionarDemonstracao(builder.Configuration);

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();
app.UseRateLimiter();
app.MapOpenApi();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapearDemonstracao();

app.Run();

public partial class Program;

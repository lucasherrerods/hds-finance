using HdsFinance.Api.Demonstracao;
using HdsFinance.Application.Extratos;
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
builder.Services.AddScoped<IRepositorioDeTransacoes, RepositorioEmMemoria>();
builder.Services.AddScoped<ImportarExtrato>();
builder.Services.AddScoped<ResumirExtrato>();
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

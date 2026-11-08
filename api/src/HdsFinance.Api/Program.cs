var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseExceptionHandler();
app.MapOpenApi();

app.MapGet("/saude", () => Results.Ok(new { status = "ok" }));

app.Run();

public partial class Program;

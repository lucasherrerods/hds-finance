using HdsFinance.Infrastructure;
using HdsFinance.Worker;

var builder = Host.CreateApplicationBuilder(args);
builder.Configuration.AddUserSecrets(Composicao.IdDosSegredos);

builder.Services.AdicionarNucleo(builder.Configuration);
builder.Services.AdicionarModoPessoal(builder.Configuration);
builder.Services.Configure<OpcoesDoWorker>(builder.Configuration.GetSection("ModoPessoal"));
builder.Services.AddHostedService<VigiaDeExtratos>();

var host = builder.Build();
await host.Services.PrepararBancoAsync();
await host.RunAsync();

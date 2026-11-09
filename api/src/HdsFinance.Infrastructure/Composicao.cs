using HdsFinance.Application.Extratos;
using HdsFinance.Application.ModoPessoal;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Extratos;
using HdsFinance.Infrastructure.Notificacoes;
using HdsFinance.Infrastructure.Relatorios;
using HdsFinance.Infrastructure.Repositorios;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HdsFinance.Infrastructure;

/// <summary>Onde se escolhe qual adaptador entra em cada porta. Api, Worker e Cli montam tudo por aqui.</summary>
public static class Composicao
{
    public const string ModoPessoal = "Pessoal";

    /// <summary>O mesmo dos UserSecretsId do Worker e da Cli: a chave do e-mail é configurada uma vez só.</summary>
    public const string IdDosSegredos = "hds-finance-modo-pessoal";

    /// <summary>O que vale nos dois modos: leitores, regras de categoria e relatório.</summary>
    public static IServiceCollection AdicionarNucleo(this IServiceCollection services, IConfiguration configuracao)
    {
        services.AddSingleton<ILeitorDeExtrato, LeitorOfx>();
        services.AddSingleton<ILeitorDeExtrato, LeitorCsvInter>();
        services.AddSingleton(new ClassificadorDeTipo(configuracao.GetSection("TermosDeTransferenciaPropria").Get<string[]>()));
        var regras = configuracao.GetSection("Categorias").Get<List<RegraDeCategoria>>();
        services.AddSingleton(regras is { Count: > 0 } ? new Categorizador(regras) : Categorizador.Padrao);
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IGeradorDeRelatorio, RelatorioQuestPdf>();
        services.AddSingleton<GerarRelatorio>();
        services.AddScoped<ImportarExtrato>();
        services.AddScoped<ResumirExtrato>();
        return services;
    }

    /// <summary>Demonstração: o repositório vive só durante a requisição.</summary>
    public static IServiceCollection AdicionarDemonstracao(this IServiceCollection services) =>
        services.AddScoped<IRepositorioDeTransacoes, RepositorioEmMemoria>();

    /// <summary>Pessoal: histórico no SQLite local e fechamento enviado por e-mail.</summary>
    public static IServiceCollection AdicionarModoPessoal(this IServiceCollection services, IConfiguration configuracao)
    {
        var caminho = configuracao["ModoPessoal:CaminhoDoBanco"] is { Length: > 0 } definido ? definido : CaminhoPadraoDoBanco();
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(caminho))!);

        services.AddDbContext<BancoDoModoPessoal>(o => o.UseSqlite($"Data Source={caminho}"));
        services.AddScoped<IRepositorioDeTransacoes, RepositorioSqlite>();
        services.AddScoped<IRegistroDoModoPessoal, RegistroSqlite>();
        services.Configure<OpcoesDeEmail>(configuracao.GetSection(OpcoesDeEmail.Secao));
        services.AddHttpClient<INotificador, NotificadorEmail>((provedor, cliente) =>
            cliente.BaseAddress = new Uri(configuracao[$"{OpcoesDeEmail.Secao}:Endereco"] ?? OpcoesDeEmail.EnderecoPadrao));
        services.AddScoped<FecharMes>();
        services.AddScoped<ProcessarExtratoRecebido>();
        return services;
    }

    /// <summary>Cria ou atualiza o banco do modo pessoal com as migrações pendentes.</summary>
    public static async Task PrepararBancoAsync(this IServiceProvider provedor, CancellationToken cancelamento = default)
    {
        await using var escopo = provedor.CreateAsyncScope();
        await escopo.ServiceProvider.GetRequiredService<BancoDoModoPessoal>().Database.MigrateAsync(cancelamento);
    }

    // Fora do repositório de propósito: o banco tem dados financeiros e nunca pode ir para o git.
    private static string CaminhoPadraoDoBanco() => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "hds-finance", "hds-finance.db");
}

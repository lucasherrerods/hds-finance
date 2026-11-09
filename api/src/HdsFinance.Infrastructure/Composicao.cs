using System.Security.Cryptography;
using HdsFinance.Application.Categorias;
using HdsFinance.Application.EmailDaDemo;
using HdsFinance.Application.Extratos;
using HdsFinance.Application.ModoPessoal;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.EmailDaDemo;
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
        services.AddSingleton(RegrasDaConfiguracao(configuracao));
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IGeradorDeRelatorio, RelatorioQuestPdf>();
        services.AddSingleton<GerarRelatorio>();
        services.AddScoped<ImportarExtrato>();
        services.AddScoped<ResumirExtrato>();

        services.Configure<OpcoesDeEmail>(configuracao.GetSection(OpcoesDeEmail.Secao));
        services.AddHttpClient<IEnvioDeEmail, EnvioDeEmailResend>(cliente =>
            cliente.BaseAddress = new Uri(configuracao[$"{OpcoesDeEmail.Secao}:Endereco"] ?? OpcoesDeEmail.EnderecoPadrao));
        return services;
    }

    /// <summary>Demonstração: o repositório vive só durante a requisição.</summary>
    public static IServiceCollection AdicionarDemonstracao(this IServiceCollection services, IConfiguration configuracao)
    {
        services.AddScoped<IRepositorioDeTransacoes, RepositorioEmMemoria>();

        // Sem chave configurada, uma aleatória vale até a api reiniciar: os e-mails confirmados antes precisam confirmar de novo.
        var chave = configuracao["Demonstracao:ChaveDeAssinatura"] is { Length: > 0 } definida
            ? definida
            : Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        services.AddSingleton<IAssinador>(new AssinadorHmac(chave));
        services.AddSingleton<IGeradorDeCodigo, GeradorDeCodigoAleatorio>();
        services.AddSingleton<ILimiteDeEnvios, LimiteDeEnviosEmMemoria>();
        services.AddScoped<ConfirmacaoDeEmail>();
        services.AddScoped<EnviarRelatorioDaDemo>();
        return services;
    }

    /// <summary>Pessoal: histórico no SQLite local e fechamento enviado por e-mail.</summary>
    public static IServiceCollection AdicionarModoPessoal(this IServiceCollection services, IConfiguration configuracao)
    {
        var caminho = configuracao["ModoPessoal:CaminhoDoBanco"] is { Length: > 0 } definido ? definido : CaminhoPadraoDoBanco();
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(caminho))!);

        services.AddDbContext<BancoDoModoPessoal>(o => o.UseSqlite($"Data Source={caminho}"));
        services.AddScoped<IRepositorioDeTransacoes, RepositorioSqlite>();
        services.AddScoped<IRegistroDoModoPessoal, RegistroSqlite>();
        services.AddScoped<INotificador, NotificadorEmail>();
        services.AddScoped<FecharMes>();
        services.AddScoped<ProcessarExtratoRecebido>();
        services.AddScoped<ConsultarHistorico>();

        // As correções da pessoa entram na frente das regras; por isso o categorizador nasce a cada requisição.
        services.AddScoped<ICategoriasAprendidas, CategoriasAprendidasSqlite>();
        services.AddScoped(provedor => RegrasDaConfiguracao(configuracao).ComAprendidas(
            provedor.GetRequiredService<BancoDoModoPessoal>().CategoriasAprendidas.AsNoTracking()
                .Select(c => new CategoriaAprendida(c.Descricao, c.Categoria))
                .ToList()));
        services.AddScoped<CorrigirCategoria>();
        return services;
    }

    /// <summary>As regras do appsettings, quando houver; senão, as padrão.</summary>
    private static Categorizador RegrasDaConfiguracao(IConfiguration configuracao) =>
        configuracao.GetSection("Categorias").Get<List<RegraDeCategoria>>() is { Count: > 0 } regras
            ? new Categorizador(regras)
            : Categorizador.Padrao;

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

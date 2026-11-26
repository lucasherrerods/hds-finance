using System.Security.Cryptography;
using HdsFinance.Application.Assistente;
using HdsFinance.Application.Categorias;
using HdsFinance.Application.Acesso;
using HdsFinance.Application.Extratos;
using HdsFinance.Application.Admin;
using HdsFinance.Application.Relatorios;
using HdsFinance.Domain;
using HdsFinance.Infrastructure.Acesso;
using HdsFinance.Infrastructure.Assistente;
using HdsFinance.Infrastructure.Extratos;
using HdsFinance.Infrastructure.Notificacoes;
using HdsFinance.Infrastructure.Relatorios;
using HdsFinance.Infrastructure.Repositorios;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HdsFinance.Infrastructure;

/// <summary>Onde se escolhe qual adaptador entra em cada porta. Api e Cli montam tudo por aqui.</summary>
public static class Composicao
{
    public const string ConexaoDoBanco = "Banco";

    /// <summary>O UserSecretsId da Cli, para ela ler a conexão do banco e a chave do e-mail sem arquivo no repositório.</summary>
    public const string IdDosSegredos = "hds-finance-modo-pessoal";

    /// <summary>O que vale nos dois modos: leitores, regras de categoria e relatório.</summary>
    public static IServiceCollection AdicionarNucleo(this IServiceCollection services, IConfiguration configuracao)
    {
        services.AddSingleton<ILeitorDeExtrato, LeitorOfx>();
        // O CSV pode ser da conta do Inter ou do Nubank: o cabeçalho diz qual.
        services.AddSingleton<ILeitorDeExtrato, LeitorCsvPorBanco>();
        services.AddSingleton(new ClassificadorDeTipo(configuracao.GetSection("TermosDeTransferenciaPropria").Get<string[]>()));
        services.AddSingleton(RegrasDaConfiguracao(configuracao));
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IGeradorDeRelatorio, RelatorioQuestPdf>();
        services.AddSingleton<GerarRelatorio>();

        services.Configure<OpcoesDeEmail>(configuracao.GetSection(OpcoesDeEmail.Secao));
        services.AddHttpClient<IEnvioDeEmail, EnvioDeEmailResend>(cliente =>
            cliente.BaseAddress = new Uri(configuracao[$"{OpcoesDeEmail.Secao}:Endereco"] ?? OpcoesDeEmail.EnderecoPadrao));
        return services;
    }

    /// <summary>
    /// Demonstração: o resumo monta o próprio repositório em memória, que some no fim da requisição,
    /// e usa só as regras da configuração. Mesmo com a área admin ligada, nada da demo chega ao banco.
    /// </summary>
    public static IServiceCollection AdicionarDemonstracao(this IServiceCollection services, IConfiguration configuracao)
    {
        var regras = RegrasDaConfiguracao(configuracao);
        services.AddScoped(provedor =>
        {
            var memoria = new RepositorioEmMemoria();
            var importar = new ImportarExtrato(
                provedor.GetServices<ILeitorDeExtrato>(), memoria, provedor.GetRequiredService<ClassificadorDeTipo>());
            return new ResumirExtrato(importar, memoria, regras);
        });
        return services;
    }

    /// <summary>A área admin só liga com o e-mail do admin e a conexão do banco configurados.</summary>
    public static bool AdminConfigurado(IConfiguration configuracao) =>
        !string.IsNullOrWhiteSpace(configuracao["Admin:Email"]) && !string.IsNullOrWhiteSpace(configuracao.GetConnectionString(ConexaoDoBanco));

    /// <summary>Admin: histórico no Postgres, login por código no e-mail do admin e fechamento enviado para ele.</summary>
    public static IServiceCollection AdicionarAdmin(this IServiceCollection services, IConfiguration configuracao)
    {
        services.AddDbContext<BancoDoAdmin>(o => o.UseNpgsql(configuracao.GetConnectionString(ConexaoDoBanco)));
        services.AddScoped<IRepositorioDeTransacoes, RepositorioPostgres>();
        // Só o admin lê o Nubank; a demonstração continua com os leitores do Inter.
        services.AddScoped(provedor => new ImportarExtrato(
            [new LeitorOfx(), new LeitorCsvPorBanco()],
            provedor.GetRequiredService<IRepositorioDeTransacoes>(),
            provedor.GetRequiredService<ClassificadorDeTipo>()));
        services.AddScoped<IRegistroDoAdmin, RegistroPostgres>();
        services.AddScoped<INotificador, NotificadorEmail>();
        services.AddScoped<FecharMes>();
        services.AddScoped<ProcessarExtratoRecebido>();
        services.AddSingleton<ILeitorDeFatura, LeitorDeFaturas>();
        services.AddScoped<ImportarFatura>();
        services.AddScoped<ConsultarHistorico>();
        services.AddScoped<ApagarDados>();
        services.AddScoped<AjustarTransacao>();

        // As correções do admin entram na frente das regras; por isso o categorizador nasce a cada requisição.
        services.AddScoped<ICategoriasAprendidas, CategoriasAprendidasPostgres>();
        services.AddScoped(provedor => RegrasDaConfiguracao(configuracao).ComAprendidas(
            provedor.GetRequiredService<BancoDoAdmin>().CategoriasAprendidas.AsNoTracking()
                .Select(c => new CategoriaAprendida(c.Descricao, c.Categoria))
                .ToList()));
        services.AddScoped<CorrigirCategoria>();

        // IA e Telegram só no admin. Sem chave ou token, os adaptadores ficam mudos e o resto funciona igual.
        services.Configure<OpcoesDoAssistente>(configuracao.GetSection(OpcoesDoAssistente.Secao));
        services.AddHttpClient<IAssistente, AssistenteGemini>(cliente =>
        {
            cliente.BaseAddress = new Uri(configuracao[$"{OpcoesDoAssistente.Secao}:Endereco"] ?? OpcoesDoAssistente.EnderecoPadrao);
            cliente.Timeout = TimeSpan.FromSeconds(30);
        });
        services.AddSingleton<MemoriaDoAssistente>();
        services.AddScoped<AnalisarMes>();
        services.AddScoped<SugerirCategorias>();
        services.AddScoped<ResponderPergunta>();
        services.AddScoped<ConversaDoBot>();

        services.Configure<OpcoesDoTelegram>(configuracao.GetSection(OpcoesDoTelegram.Secao));
        // O token vai na URL da Bot API: sem os loggers do HttpClient, ele nunca chega ao log.
        services.AddHttpClient<IMensageiro, MensageiroTelegram>(cliente =>
        {
            cliente.BaseAddress = new Uri(configuracao[$"{OpcoesDoTelegram.Secao}:Endereco"] ?? OpcoesDoTelegram.EnderecoPadrao);
            cliente.Timeout = TimeSpan.FromSeconds(30);
        }).RemoveAllLoggers();

        // Sem chave configurada, uma aleatória vale até a api reiniciar: o admin entra de novo depois disso.
        var chave = configuracao["Admin:ChaveDeAssinatura"] is { Length: > 0 } definida
            ? definida
            : Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        services.AddSingleton<IAssinador>(new AssinadorHmac(chave));
        services.AddSingleton<IGeradorDeCodigo, GeradorDeCodigoAleatorio>();
        services.AddSingleton<ILimiteDeEnvios, LimiteDeEnviosEmMemoria>();
        services.AddSingleton(new ConfiguracaoDoAdmin(configuracao["Admin:Email"]!));
        services.AddSingleton<IEnvioEmSegundoPlano, EnvioEmSegundoPlano>();
        services.AddSingleton<AcessoDoAdmin>();
        return services;
    }

    /// <summary>As regras do appsettings, quando houver; senão, as padrão.</summary>
    private static Categorizador RegrasDaConfiguracao(IConfiguration configuracao) =>
        configuracao.GetSection("Categorias").Get<List<RegraDeCategoria>>() is { Count: > 0 } regras
            ? new Categorizador(regras)
            : Categorizador.Padrao;

    /// <summary>Aplica as migrações pendentes no Postgres. Nos testes, com SQLite em memória, cria o esquema direto.</summary>
    public static async Task PrepararBancoAsync(this IServiceProvider provedor, CancellationToken cancelamento = default)
    {
        await using var escopo = provedor.CreateAsyncScope();
        var banco = escopo.ServiceProvider.GetRequiredService<BancoDoAdmin>().Database;
        if (banco.IsNpgsql())
        {
            await banco.MigrateAsync(cancelamento);
        }
        else
        {
            await banco.EnsureCreatedAsync(cancelamento);
        }
    }
}

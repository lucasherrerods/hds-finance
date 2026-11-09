using HdsFinance.Domain;
using Microsoft.EntityFrameworkCore;

namespace HdsFinance.Infrastructure.Repositorios;

// Entidades do EF Core ficam aqui: o domínio continua com os próprios tipos.
public sealed class TransacaoSalva
{
    public int Id { get; set; }

    public required string Chave { get; set; }

    public DateOnly Data { get; set; }

    public decimal Valor { get; set; }

    public required string Descricao { get; set; }

    public TipoDeTransacao Tipo { get; set; }

    public string? IdExterno { get; set; }
}

public sealed class ExtratoImportado
{
    public int Id { get; set; }

    public DateOnly? CobertoAte { get; set; }

    public decimal? SaldoFinal { get; set; }
}

public sealed class MesEnviado
{
    public int Ano { get; set; }

    public int Mes { get; set; }

    public DateTimeOffset EnviadoEm { get; set; }
}

/// <summary>O banco SQLite do modo pessoal. Só existe na máquina do dono.</summary>
public sealed class BancoDoModoPessoal(DbContextOptions<BancoDoModoPessoal> opcoes) : DbContext(opcoes)
{
    public DbSet<TransacaoSalva> Transacoes => Set<TransacaoSalva>();

    public DbSet<ExtratoImportado> Extratos => Set<ExtratoImportado>();

    public DbSet<MesEnviado> MesesEnviados => Set<MesEnviado>();

    protected override void OnModelCreating(ModelBuilder modelo)
    {
        modelo.Entity<TransacaoSalva>(t =>
        {
            t.HasIndex(x => x.Chave).IsUnique();
            t.Property(x => x.Tipo).HasConversion<string>();
        });
        modelo.Entity<MesEnviado>().HasKey(m => new { m.Ano, m.Mes });
    }

    // O SQLite não ordena decimal nem DateTimeOffset; guardar como texto e número mantém o valor exato.
    protected override void ConfigureConventions(ModelConfigurationBuilder convencoes)
    {
        convencoes.Properties<decimal>().HaveConversion<string>();
        convencoes.Properties<DateTimeOffset>().HaveConversion<long>();
    }
}

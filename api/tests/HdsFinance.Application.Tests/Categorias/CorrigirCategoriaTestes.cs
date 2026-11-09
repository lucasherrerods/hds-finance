using FluentAssertions;
using HdsFinance.Application.Categorias;
using HdsFinance.Domain;

namespace HdsFinance.Application.Tests.Categorias;

public class CorrigirCategoriaTestes
{
    private sealed class AprendidasFalsas : ICategoriasAprendidas
    {
        public List<CategoriaAprendida> Salvas { get; } = [];

        public Task<IReadOnlyList<CategoriaAprendida>> ListarAsync(CancellationToken cancelamento = default) =>
            Task.FromResult<IReadOnlyList<CategoriaAprendida>>(Salvas);

        public Task SalvarAsync(CategoriaAprendida aprendida, CancellationToken cancelamento = default)
        {
            Salvas.Add(aprendida);
            return Task.CompletedTask;
        }
    }

    private readonly AprendidasFalsas _aprendidas = new();
    private readonly CorrigirCategoria _corrigir;

    public CorrigirCategoriaTestes() =>
        _corrigir = new CorrigirCategoria(_aprendidas, new Categorizador([new RegraDeCategoria("Moradia", ["aluguel"])]));

    [Fact]
    public async Task Guarda_a_correcao_para_a_descricao()
    {
        var resultado = await _corrigir.ExecutarAsync("Pix enviado João", "Moradia");

        resultado.Should().Be(new ResultadoDaCorrecao.Corrigida());
        _aprendidas.Salvas.Should().ContainSingle().Which.Should().Be(new CategoriaAprendida("Pix enviado João", "Moradia"));
    }

    [Fact]
    public async Task Aceita_voltar_para_sem_categoria()
    {
        (await _corrigir.ExecutarAsync("Pix enviado João", Categorizador.SemCategoria)).Should().Be(new ResultadoDaCorrecao.Corrigida());
    }

    [Fact]
    public async Task Recusa_categoria_que_nao_existe()
    {
        (await _corrigir.ExecutarAsync("Pix enviado João", "Inventada")).Should().Be(new ResultadoDaCorrecao.CategoriaInvalida());
        _aprendidas.Salvas.Should().BeEmpty();
    }

    [Fact]
    public async Task Recusa_descricao_vazia()
    {
        (await _corrigir.ExecutarAsync("  ", "Moradia")).Should().Be(new ResultadoDaCorrecao.DescricaoVazia());
    }
}

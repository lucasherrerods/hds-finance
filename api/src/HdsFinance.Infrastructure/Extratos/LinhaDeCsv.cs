using System.Text;

namespace HdsFinance.Infrastructure.Extratos;

/// <summary>Separa por vírgula respeitando aspas.</summary>
internal static class LinhaDeCsv
{
    public static List<string> Separar(string linha)
    {
        var campos = new List<string>();
        var atual = new StringBuilder();
        var entreAspas = false;
        for (var i = 0; i < linha.Length; i++)
        {
            if (linha[i] == '"' && entreAspas && i + 1 < linha.Length && linha[i + 1] == '"')
            {
                atual.Append('"');
                i++;
            }
            else if (linha[i] == '"')
            {
                entreAspas = !entreAspas;
            }
            else if (linha[i] == ',' && !entreAspas)
            {
                campos.Add(atual.ToString());
                atual.Clear();
            }
            else
            {
                atual.Append(linha[i]);
            }
        }

        campos.Add(atual.ToString());
        return campos;
    }
}

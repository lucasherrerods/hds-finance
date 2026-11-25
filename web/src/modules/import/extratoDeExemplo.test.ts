import { describe, expect, it } from 'vitest'
import { extratoDeExemplo } from './extratoDeExemplo'

const ler = (arquivo: File) =>
  new Promise<string>((resolver) => {
    const leitor = new FileReader()
    leitor.onload = () => resolver(String(leitor.result))
    leitor.readAsText(arquivo)
  })

describe('extratoDeExemplo', () => {
  it('traz os seis meses completos antes de hoje, mesmo virando o ano', async () => {
    const texto = await ler(extratoDeExemplo(new Date(2026, 1, 10)))
    const meses = new Set(texto.split('\n').slice(1).map((l) => l.slice(3, 10)))
    expect([...meses]).toEqual(['08/2025', '09/2025', '10/2025', '11/2025', '12/2025', '01/2026'])
  })

  it('segue o formato do csv do Inter e tem um empréstimo para mostrar', async () => {
    const arquivo = extratoDeExemplo(new Date(2026, 10, 25))
    const linhas = (await ler(arquivo)).split('\n')
    expect(arquivo.name).toMatch(/\.csv$/)
    expect(linhas[0]).toBe('Data Lançamento;Histórico;Descrição;Valor;Saldo')
    for (const linha of linhas.slice(1)) expect(linha).toMatch(/^\d{2}\/\d{2}\/\d{4};[^;]+;[^;]+;-?[\d.]+,\d{2};-?[\d.]+,\d{2}$/)
    expect(linhas.join()).toContain('Emprestimo pessoal')
  })
})

import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OrcamentoDoMes } from './OrcamentoDoMes'
import { ProjecaoDoMes } from './ProjecaoDoMes'
import { RecorrentesDoMes } from './RecorrentesDoMes'

vi.mock('./api', () => ({ definirOrcamento: vi.fn() }))
const api = await import('./api')

beforeEach(() => vi.mocked(api.definirOrcamento).mockResolvedValue({ ok: true }))
afterEach(() => vi.resetAllMocks())

describe('OrcamentoDoMes', () => {
  const orcamento = [
    { grupo: 'Alimentação', limite: 500, gasto: 530, percentual: 106, situacao: 'Estourou' as const },
    { grupo: 'Transporte', limite: 200, gasto: 170, percentual: 85, situacao: 'Atencao' as const },
  ]

  it('mostra o gasto contra o limite e a situação escrita, não só pela cor', () => {
    render(<OrcamentoDoMes orcamento={orcamento} grupos={['Alimentação', 'Transporte', 'Lazer']} aoSalvar={vi.fn()} />)

    const alimentacao = screen.getByRole('group', { name: 'Alimentação' })
    expect(alimentacao).toHaveTextContent('R$ 530,00 de R$ 500,00')
    expect(alimentacao).toHaveTextContent('Estourou')
    expect(screen.getByRole('group', { name: 'Transporte' })).toHaveTextContent('Atenção')
  })

  it('edita os limites e salva só o que mudou', async () => {
    const aoSalvar = vi.fn()
    render(<OrcamentoDoMes orcamento={orcamento} grupos={['Alimentação', 'Transporte', 'Lazer']} aoSalvar={aoSalvar} />)

    fireEvent.click(screen.getByRole('button', { name: /editar limites/i }))
    const dialogo = screen.getByRole('dialog', { name: /limites por grupo/i })
    fireEvent.change(within(dialogo).getByLabelText('Limite de Lazer'), { target: { value: '150' } })
    fireEvent.change(within(dialogo).getByLabelText('Limite de Transporte'), { target: { value: '' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: /salvar/i }))

    await vi.waitFor(() => expect(aoSalvar).toHaveBeenCalled())
    expect(api.definirOrcamento).toHaveBeenCalledWith('Transporte', null)
    expect(api.definirOrcamento).toHaveBeenCalledWith('Lazer', 150)
    expect(api.definirOrcamento).not.toHaveBeenCalledWith('Alimentação', expect.anything())
  })

  it('sem limites, convida a definir', () => {
    render(<OrcamentoDoMes orcamento={[]} grupos={['Lazer']} aoSalvar={vi.fn()} />)

    expect(screen.getByRole('button', { name: /definir limites/i })).toBeInTheDocument()
  })
})

describe('RecorrentesDoMes', () => {
  it('soma o fixo do mês e diz o que já saiu, o que falta e o que ficou mais caro', () => {
    render(
      <RecorrentesDoMes
        recorrentes={[
          { descricao: 'EBN SPOTIFY', categoria: 'Streaming de música', grupo: 'Serviços digitais', valor: 12.9, dia: 9, situacao: 'Paga', valorNoMes: 12.9 },
          { descricao: 'Pix enviado Fabio', categoria: 'Moradia', grupo: 'Moradia', valor: 125, dia: 8, situacao: 'MaisCara', valorNoMes: 152.5 },
          { descricao: 'Pix enviado Jaqueline', categoria: 'Academia', grupo: 'Saúde', valor: 70, dia: 20, situacao: 'Pendente', valorNoMes: null },
        ]}
      />,
    )

    expect(screen.getByText(/R\$ 207,90/)).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: 'EBN SPOTIFY' })).toHaveTextContent('Paga')
    expect(screen.getByRole('listitem', { name: 'Pix enviado Fabio' })).toHaveTextContent('+R$ 27,50')
    expect(screen.getByRole('listitem', { name: 'Pix enviado Jaqueline' })).toHaveTextContent('Dia 20')
  })
})

describe('ProjecaoDoMes', () => {
  const projecao = {
    ano: 2026,
    mes: 11,
    diasPassados: 10,
    diasNoMes: 30,
    gastoAteAgora: 112.9,
    gastoProjetado: 462.9,
    recorrentesPendentes: 150,
    entradas: 4000,
    sobraProjetada: 3537.1,
  }

  it('diz com quanto o mês deve fechar', () => {
    render(<ProjecaoDoMes projecao={projecao} />)

    expect(screen.getByRole('region', { name: /projeção do mês/i })).toHaveTextContent(/sobrando R\$ 3\.537,10/)
  })

  it('avisa quando a projeção é de faltar', () => {
    render(<ProjecaoDoMes projecao={{ ...projecao, sobraProjetada: -200 }} />)

    expect(screen.getByRole('region', { name: /projeção do mês/i })).toHaveTextContent(/faltando R\$ 200,00/)
  })
})

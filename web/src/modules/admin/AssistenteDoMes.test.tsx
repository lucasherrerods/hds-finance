import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistenteDoMes } from './AssistenteDoMes'

vi.mock('./api', () => ({ buscarAnalise: vi.fn(), perguntar: vi.fn() }))
const api = await import('./api')

const outubro = { ano: 2026, mes: 10 }

beforeEach(() => {
  vi.mocked(api.buscarAnalise).mockResolvedValue({
    ok: true,
    analise: {
      ano: 2026,
      mes: 10,
      comentario: 'Supermercado pesou mais.',
      alertas: [{ tipo: 'GastoAcimaDaMedia', assunto: 'Supermercado', valor: 500, referencia: 300, texto: 'Supermercado: R$ 500,00, acima da média de R$ 300,00.' }],
    },
  })
})

afterEach(() => vi.resetAllMocks())

describe('AssistenteDoMes', () => {
  it('mostra o comentário e os alertas do mês', async () => {
    render(<AssistenteDoMes mes={outubro} />)

    expect(await screen.findByText('Supermercado pesou mais.')).toBeInTheDocument()
    expect(screen.getByText(/acima da média de R\$ 300,00/)).toBeInTheDocument()
  })

  it('sem IA, avisa onde o comentário vai aparecer e mantém os alertas', async () => {
    vi.mocked(api.buscarAnalise).mockResolvedValue({ ok: true, analise: { ano: 2026, mes: 10, comentario: null, alertas: [] } })
    render(<AssistenteDoMes mes={outubro} />)

    expect(await screen.findByText(/chave do Gemini/)).toBeInTheDocument()
    expect(screen.getByText(/Nenhum gasto fora do padrão/)).toBeInTheDocument()
  })

  it('responde a pergunta', async () => {
    vi.mocked(api.perguntar).mockResolvedValue({ ok: true, resposta: 'Alimentação: R$ 300,00 em 2026.' })
    render(<AssistenteDoMes mes={outubro} />)

    fireEvent.change(screen.getByLabelText('Pergunte'), { target: { value: 'quanto gastei com comida?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Perguntar' }))

    expect(await screen.findByText('Alimentação: R$ 300,00 em 2026.')).toBeInTheDocument()
    expect(api.perguntar).toHaveBeenCalledWith('quanto gastei com comida?')
  })

  it('a pergunta pronta pergunta com um clique', async () => {
    vi.mocked(api.perguntar).mockResolvedValue({ ok: true, resposta: 'Onde mais saiu dinheiro…' })
    render(<AssistenteDoMes mes={outubro} />)

    fireEvent.click(screen.getByRole('button', { name: 'Onde mais gastei nos últimos 3 meses?' }))

    expect(await screen.findByText('Onde mais saiu dinheiro…')).toBeInTheDocument()
    expect(api.perguntar).toHaveBeenCalledWith('Onde mais gastei nos últimos 3 meses?')
  })
})

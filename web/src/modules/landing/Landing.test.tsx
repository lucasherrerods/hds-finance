import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import { Cabecalho as CabecalhoSemRota, ComoUsar, ExemploDeResultado, Inicio as InicioSemRota, Privacidade, Rodape } from '.'

const Cabecalho = () => (
  <MemoryRouter>
    <CabecalhoSemRota />
  </MemoryRouter>
)
const Inicio = () => (
  <MemoryRouter>
    <InicioSemRota />
  </MemoryRouter>
)

describe('landing', () => {
  it('o cabeçalho leva a cada seção da página', () => {
    render(<Cabecalho />)

    const navegacao = screen.getByRole('navigation', { name: 'Seções' })
    expect(within(navegacao).getByRole('link', { name: 'Como usar' })).toHaveAttribute('href', '/#como-usar')
    expect(within(navegacao).getByRole('link', { name: 'Exemplo' })).toHaveAttribute('href', '/#exemplo')
    expect(within(navegacao).getByRole('link', { name: 'Privacidade' })).toHaveAttribute('href', '/#privacidade')
  })

  it('o botão de tema alterna entre claro e escuro', () => {
    document.documentElement.dataset.tema = 'claro'
    render(<Cabecalho />)

    fireEvent.click(screen.getByRole('button', { name: /tema escuro/i }))

    expect(document.documentElement.dataset.tema).toBe('escuro')
    expect(screen.getByRole('button', { name: /tema claro/i })).toBeInTheDocument()
  })

  it('o início chama para testar com o próprio extrato', () => {
    render(<Inicio />)

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /testar com meu extrato/i })).toHaveAttribute('href', '/testar')
  })

  it('como usar explica os três passos', () => {
    render(<ComoUsar />)

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('o exemplo deixa claro que os dados são fictícios', () => {
    render(<ExemploDeResultado />)

    expect(screen.getByText(/dados fictícios/i)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Destaque do mês' })).toBeInTheDocument()
  })

  it('a seção de privacidade avisa que nada é armazenado', () => {
    render(<Privacidade />)

    expect(screen.getByRole('heading', { name: /privacidade/i })).toBeInTheDocument()
    expect(screen.getAllByText(/nada|nunca/i).length).toBeGreaterThan(0)
  })
})

describe('rodapé', () => {
  it('leva ao código e ao perfil do autor e mostra o copyright', () => {
    render(<Rodape />)

    expect(screen.getByRole('link', { name: /código no github/i })).toHaveAttribute('href', 'https://github.com/lucasherrerods/hds-finance')
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', 'https://www.linkedin.com/in/lucasherrero/')
    expect(screen.getByText(/© 2026 hds finance/i)).toBeInTheDocument()
  })
})

describe('exemplo com gráficos', () => {
  beforeAll(async () => {
    // Os gráficos carregam sob demanda. Carregar os módulos antes evita que o teste dependa
    // do tempo do primeiro import do Recharts, que com a suíte inteira às vezes passava de 5 s.
    await import('../dashboard/RitmoDeGastos')
  })

  it('mostra só o painel do mês fictício, sem o período nem as transações', async () => {
    render(<ExemploDeResultado />)

    expect(screen.getByRole('region', { name: 'Destaque do mês' })).toHaveTextContent('Sem categoria subiu 24%')
    expect(screen.getByRole('table', { name: 'Principais categorias' })).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'Gasto acumulado por dia' })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Entradas e saídas por mês' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Transações' })).not.toBeInTheDocument()
  })
})

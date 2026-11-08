import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import { Cabecalho as CabecalhoSemRota, ComoUsar, ExemploDeResultado, Inicio as InicioSemRota, Privacidade } from '.'

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
    expect(screen.getByRole('group', { name: 'Entradas' })).toBeInTheDocument()
  })

  it('a seção de privacidade avisa que nada é armazenado', () => {
    render(<Privacidade />)

    expect(screen.getByRole('heading', { name: /privacidade/i })).toBeInTheDocument()
    expect(screen.getAllByText(/nada|nunca/i).length).toBeGreaterThan(0)
  })
})

describe('exemplo de resultado', () => {
  it('mostra o saldo e os investimentos do mês fictício', () => {
    render(<ExemploDeResultado />)

    expect(screen.getByRole('group', { name: 'Saldo' })).toHaveTextContent('R$ 3.593,15 → R$ 4.695,35')
    expect(screen.getByRole('group', { name: 'Investimentos e transferências' })).toHaveTextContent('−R$ 2.000,00')
  })
})

describe('exemplo com gráficos', () => {
  it('mostra a evolução dos meses fictícios', async () => {
    render(<ExemploDeResultado />)

    expect(await screen.findByRole('table', { name: 'Entradas e saídas por mês' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Saldo no fim de cada mês' })).toBeInTheDocument()
  }, 10_000)
})

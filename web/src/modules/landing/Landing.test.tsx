import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Cabecalho, ComoUsar, ExemploDeResultado, Inicio, Privacidade } from '.'

describe('landing', () => {
  it('o cabeçalho leva a cada seção da página', () => {
    render(<Cabecalho />)

    const navegacao = screen.getByRole('navigation', { name: 'Seções' })
    expect(within(navegacao).getByRole('link', { name: 'Como usar' })).toHaveAttribute('href', '#como-usar')
    expect(within(navegacao).getByRole('link', { name: 'Exemplo' })).toHaveAttribute('href', '#exemplo')
    expect(within(navegacao).getByRole('link', { name: 'Privacidade' })).toHaveAttribute('href', '#privacidade')
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
    expect(screen.getByRole('link', { name: /testar com meu extrato/i })).toHaveAttribute('href', '#testar')
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

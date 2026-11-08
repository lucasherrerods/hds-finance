import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'

function abrir(caminho: string) {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <App />
    </MemoryRouter>,
  )
}

describe('rotas', () => {
  it('a página inicial apresenta o projeto sem o formulário de envio', () => {
    abrir('/')

    expect(screen.getByRole('heading', { level: 1, name: /fechamento do seu mês/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/extrato do inter/i)).not.toBeInTheDocument()
  })

  it('a página de teste tem o envio do extrato e o aviso de privacidade', () => {
    abrir('/testar')

    expect(screen.getByRole('heading', { level: 1, name: /teste com o seu extrato/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/extrato do inter/i)).toBeInTheDocument()
    expect(screen.getByText(/nada é armazenado/i)).toBeInTheDocument()
  })

  it('um endereço desconhecido volta para a página inicial', () => {
    abrir('/qualquer-coisa')

    expect(screen.getByRole('heading', { level: 1, name: /fechamento do seu mês/i })).toBeInTheDocument()
  })
})

describe('âncoras', () => {
  it('ao abrir um endereço com âncora, rola até a seção depois de desenhar a página', () => {
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar

    abrir('/#exemplo')

    expect(rolar).toHaveBeenCalled()
    expect(rolar.mock.contexts[0]).toBe(document.getElementById('exemplo'))
  })
})

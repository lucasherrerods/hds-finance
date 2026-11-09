import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mesesDeExemplo, painelDeExemplo } from '../modules/landing'
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

    expect(screen.getByRole('heading', { level: 1, name: /pra onde foi o seu dinheiro/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/extrato do inter/i)).not.toBeInTheDocument()
  })

  it('a página de teste tem o envio do extrato e o aviso de privacidade', () => {
    abrir('/testar')

    expect(screen.getByRole('heading', { level: 1, name: /solta o extrato aqui/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/extrato do inter/i)).toBeInTheDocument()
    expect(screen.getByText(/nada é armazenado/i)).toBeInTheDocument()
  })

  it('um endereço desconhecido volta para a página inicial', () => {
    abrir('/qualquer-coisa')

    expect(screen.getByRole('heading', { level: 1, name: /pra onde foi o seu dinheiro/i })).toBeInTheDocument()
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

describe('modo pessoal', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('no modo pessoal, o histórico tem página e link no cabeçalho', async () => {
    vi.stubEnv('VITE_MODO', 'pessoal')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ meses: [], painel: null, transacoes: [] }))))

    abrir('/historico')

    expect(await screen.findByRole('heading', { level: 1, name: /seu histórico/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Histórico' })).toHaveAttribute('href', '/historico')
    vi.unstubAllGlobals()
  })

  it('na demonstração, o histórico não existe', () => {
    vi.stubEnv('VITE_MODO', 'demonstracao')

    abrir('/historico')

    expect(screen.getByRole('heading', { level: 1, name: /pra onde foi o seu dinheiro/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Histórico' })).not.toBeInTheDocument()
  })
})

describe('dashboard', () => {
  const resumo = {
    transacoesNovas: 3,
    duplicadas: 0,
    meses: mesesDeExemplo,
    painel: painelDeExemplo,
    transacoes: painelDeExemplo.transacoesRecentes,
  }

  async function verResumo() {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(resumo))))
    abrir('/testar')
    fireEvent.drop(screen.getByTestId('area-do-arquivo'), { dataTransfer: { files: [new File(['x'], 'outubro.ofx')] } })
    fireEvent.click(screen.getByRole('button', { name: /ver resumo/i }))
    return within(await screen.findByRole('navigation', { name: 'Seções do dashboard' }, { timeout: 5000 }))
  }

  afterEach(() => vi.unstubAllGlobals())

  it('sem extrato enviado, o dashboard volta para a página de envio', () => {
    abrir('/dashboard')

    expect(screen.getByRole('heading', { level: 1, name: /solta o extrato aqui/i })).toBeInTheDocument()
  })

  it('depois de ver o resumo, abre a visão geral com a sidebar', async () => {
    const menu = await verResumo()

    expect(menu.getByRole('link', { name: /visão geral/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { level: 1, name: /outubro de 2026/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Entrou' })).toBeInTheDocument()
    expect(screen.getByText('outubro.ofx')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Como usar' })).not.toBeInTheDocument()
  })

  it('a sidebar leva a cada seção', async () => {
    const menu = await verResumo()

    fireEvent.click(menu.getByRole('link', { name: /transações/i }))
    expect(await screen.findByRole('tablist', { name: 'Anos' })).toBeInTheDocument()

    fireEvent.click(menu.getByRole('link', { name: /investimentos/i }))
    expect(await screen.findByRole('heading', { level: 1, name: /investimentos/i })).toBeInTheDocument()

    fireEvent.click(menu.getByRole('link', { name: /relatório/i }))
    expect(await screen.findByRole('button', { name: /baixar pdf/i })).toBeInTheDocument()
  })

  it('trocar o extrato esquece o resultado e volta para o envio', async () => {
    await verResumo()

    // Há um botão para celular e outro para computador; o CSS mostra um de cada vez, o jsdom vê os dois.
    fireEvent.click(screen.getAllByRole('button', { name: /trocar extrato/i })[0])

    expect(await screen.findByRole('heading', { level: 1, name: /solta o extrato aqui/i })).toBeInTheDocument()
  })
})

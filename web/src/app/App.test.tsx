import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  const historico = { meses: mesesDeExemplo, painel: painelDeExemplo, transacoes: painelDeExemplo.transacoesRecentes }

  function apiLocal(dados: unknown = historico) {
    const fetchFalso = vi.fn((url: string) =>
      Promise.resolve(
        url.endsWith('/pessoal/extratos')
          ? new Response(JSON.stringify({ transacoesNovas: 3, duplicadas: 0, fechamento: 'Nenhum mês completo para fechar.' }))
          : new Response(JSON.stringify(dados)),
      ),
    )
    vi.stubGlobal('fetch', fetchFalso)
    return fetchFalso
  }

  beforeEach(() => vi.stubEnv('VITE_MODO', 'pessoal'))
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('o cabeçalho leva ao dashboard em vez da página de teste', () => {
    abrir('/')

    expect(screen.getByRole('link', { name: 'Ver dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.queryByRole('link', { name: 'Testar' })).not.toBeInTheDocument()
  })

  it('o dashboard abre com o histórico guardado, sem enviar nada', async () => {
    apiLocal()

    abrir('/dashboard')

    expect(await screen.findByRole('heading', { level: 1, name: /outubro de 2026/i }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByText('Histórico local')).toBeInTheDocument()
  })

  it('adicionar extrato importa no histórico e recarrega o dashboard', async () => {
    const fetchFalso = apiLocal()
    abrir('/dashboard')
    await screen.findByRole('heading', { level: 1, name: /outubro de 2026/i }, { timeout: 5000 })

    fireEvent.change(screen.getAllByLabelText(/adicionar extrato/i)[0], { target: { files: [new File(['x'], 'novembro.ofx')] } })

    expect(await screen.findByRole('status')).toHaveTextContent('3 transações novas, 0 já existiam.')
    const chamadasDoHistorico = fetchFalso.mock.calls.filter(([url]) => url.endsWith('/pessoal/historico'))
    expect(chamadasDoHistorico).toHaveLength(2)
  })

  it('com o histórico vazio, convida a adicionar o primeiro extrato', async () => {
    apiLocal({ meses: [], painel: null, transacoes: [] })

    abrir('/dashboard')

    expect(await screen.findByRole('heading', { level: 1, name: /nenhum extrato ainda/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/adicionar o primeiro extrato/i)).toBeInTheDocument()
  })

  it('a página de teste leva direto ao dashboard', async () => {
    apiLocal()

    abrir('/testar')

    expect(await screen.findByRole('navigation', { name: 'Seções do dashboard' }, { timeout: 5000 })).toBeInTheDocument()
  })

  it('o relatório gera do histórico e envia o fechamento para o dono', async () => {
    apiLocal()
    abrir('/dashboard/relatorio')

    expect(await screen.findByRole('button', { name: /enviar fechamento/i }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /baixar pdf/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mandar código/i })).not.toBeInTheDocument()
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

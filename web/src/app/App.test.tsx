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

describe('área admin', () => {
  const historico = {
    meses: mesesDeExemplo,
    painel: painelDeExemplo,
    transacoes: painelDeExemplo.transacoesRecentes,
    categorias: ['Alimentação', 'Lazer', 'Sem categoria'],
  }

  function respostaPara(url: string, dados: unknown, logado: boolean) {
    if (url.endsWith('/admin/acesso/sessao')) return new Response(null, { status: logado ? 204 : 401 })
    if (url.includes('/admin/acesso/')) return new Response(null, { status: 204 })
    if (url.endsWith('/admin/extratos')) {
      return new Response(JSON.stringify({ transacoesNovas: 3, duplicadas: 0, fechamento: 'Nenhum mês completo para fechar.' }))
    }
    if (url.endsWith('/admin/categorias')) return new Response(null, { status: 204 })
    if (url.includes('/admin/transacoes') || url.includes('/admin/meses/')) return new Response(JSON.stringify({ apagadas: 1 }))
    return new Response(JSON.stringify(dados))
  }

  function apiDoAdmin({ dados = historico as unknown, logado = true } = {}) {
    const fetchFalso = vi.fn((url: string, _opcoes?: RequestInit) => Promise.resolve(respostaPara(url, dados, logado)))
    vi.stubGlobal('fetch', fetchFalso)
    return fetchFalso
  }

  const chamadas = (fetchFalso: ReturnType<typeof apiDoAdmin>, trecho: string) =>
    fetchFalso.mock.calls.filter(([url]) => url.includes(trecho))

  beforeEach(() => vi.stubGlobal('confirm', () => true))
  afterEach(() => vi.unstubAllGlobals())

  it('o site não tem link para a área admin', () => {
    abrir('/')

    expect(screen.queryByRole('link', { name: /admin|entrar/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Testar agora' })).toHaveAttribute('href', '/testar')
  })

  it('sem sessão, a área admin manda para a entrada', async () => {
    apiDoAdmin({ logado: false })

    abrir('/admin')

    expect(await screen.findByRole('heading', { level: 1, name: /área restrita/i })).toBeInTheDocument()
  })

  it('a entrada pede o código e, confirmado, abre o histórico', async () => {
    const fetchFalso = apiDoAdmin()
    abrir('/admin/entrar')

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'eu@exemplo.com' } })
    fireEvent.click(screen.getByRole('button', { name: /receber código/i }))
    fireEvent.change(await screen.findByLabelText('Código'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('heading', { level: 1, name: /outubro de 2026/i }, { timeout: 5000 })).toBeInTheDocument()
    expect(chamadas(fetchFalso, '/admin/acesso/confirmar')).toHaveLength(1)
  })

  it('logado, abre com o histórico guardado e o botão de incluir extrato', async () => {
    apiDoAdmin()

    abrir('/admin')

    expect(await screen.findByRole('heading', { level: 1, name: /outubro de 2026/i }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByText('Seu histórico')).toBeInTheDocument()
    expect(screen.getByLabelText(/incluir extrato/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /trocar extrato/i })).not.toBeInTheDocument()
  })

  it('incluir extrato soma ao histórico e recarrega', async () => {
    const fetchFalso = apiDoAdmin()
    abrir('/admin')
    await screen.findByRole('heading', { level: 1, name: /outubro de 2026/i }, { timeout: 5000 })

    fireEvent.change(screen.getByLabelText(/incluir extrato/i), { target: { files: [new File(['x'], 'novembro.ofx')] } })

    expect(await screen.findByRole('status')).toHaveTextContent('3 transações novas, 0 já existiam.')
    await vi.waitFor(() => expect(chamadas(fetchFalso, '/admin/historico')).toHaveLength(2))
  })

  it('trocar a categoria de uma transação guarda a escolha e recarrega', async () => {
    const fetchFalso = apiDoAdmin()
    abrir('/admin/transacoes')

    const [seletor] = await screen.findAllByRole('combobox', { name: /^categoria de /i }, { timeout: 5000 })
    fireEvent.change(seletor, { target: { value: 'Lazer' } })

    expect(await screen.findByRole('status')).toHaveTextContent('agora é Lazer')
    expect(chamadas(fetchFalso, '/admin/categorias')[0][1]).toMatchObject({ method: 'PUT' })
    await vi.waitFor(() => expect(chamadas(fetchFalso, '/admin/historico')).toHaveLength(2))
  })

  it('apaga uma transação depois de confirmar', async () => {
    const fetchFalso = apiDoAdmin()
    abrir('/admin/transacoes')

    const [lixeira] = await screen.findAllByRole('button', { name: /^apagar /i }, { timeout: 5000 })
    fireEvent.click(lixeira)

    expect(await screen.findByRole('status')).toHaveTextContent('saiu do histórico')
    expect(chamadas(fetchFalso, '/admin/transacoes/apagar')[0][1]).toMatchObject({ method: 'POST' })
  })

  it('não apaga nada se o admin desistir na confirmação', async () => {
    vi.stubGlobal('confirm', () => false)
    const fetchFalso = apiDoAdmin()
    abrir('/admin/evolucao')

    const [lixeira] = await screen.findAllByRole('button', { name: /^apagar /i }, { timeout: 5000 })
    fireEvent.click(lixeira)

    expect(chamadas(fetchFalso, '/admin/meses/')).toHaveLength(0)
  })

  it('apaga um mês inteiro na evolução', async () => {
    const fetchFalso = apiDoAdmin()
    abrir('/admin/evolucao')

    const [lixeira] = await screen.findAllByRole('button', { name: /^apagar /i }, { timeout: 5000 })
    fireEvent.click(lixeira)

    expect(await screen.findByRole('status')).toHaveTextContent('saiu do histórico')
    expect(chamadas(fetchFalso, '/admin/meses/')[0][1]).toMatchObject({ method: 'DELETE' })
  })

  it('com o histórico vazio, convida a incluir o primeiro extrato', async () => {
    apiDoAdmin({ dados: { meses: [], painel: null, transacoes: [], categorias: [] } })

    abrir('/admin')

    expect(await screen.findByRole('heading', { level: 1, name: /nenhum extrato ainda/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/incluir o primeiro extrato/i)).toBeInTheDocument()
  })

  it('o relatório gera do histórico e envia o fechamento para o admin', async () => {
    apiDoAdmin()
    abrir('/admin/relatorio')

    expect(await screen.findByRole('button', { name: /enviar fechamento/i }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /baixar pdf/i })).toBeInTheDocument()
  })

  it('sair encerra a sessão e volta para a entrada', async () => {
    const fetchFalso = apiDoAdmin()
    abrir('/admin')
    await screen.findByRole('heading', { level: 1, name: /outubro de 2026/i }, { timeout: 5000 })

    fireEvent.click(screen.getByRole('button', { name: /^sair$/i }))

    expect(await screen.findByRole('heading', { level: 1, name: /área restrita/i })).toBeInTheDocument()
    expect(chamadas(fetchFalso, '/admin/acesso/sair')).toHaveLength(1)
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
    expect(screen.queryByRole('link', { name: 'Como funciona' })).not.toBeInTheDocument()
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

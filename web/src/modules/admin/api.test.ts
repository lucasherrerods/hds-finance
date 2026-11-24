import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  adicionarExtrato,
  adicionarFatura,
  apagarMes,
  apagarTransacao,
  buscarHistorico,
  confirmarCodigo,
  corrigirCategoria,
  enviarFechamento,
  pedirCodigo,
  sessaoAberta,
} from './api'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('buscarHistorico', () => {
  it('lê o histórico guardado do admin', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const historico = { meses: [], painel: null, transacoes: [] }
    const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify(historico), { status: 200 }))
    vi.stubGlobal('fetch', fetchFalso)

    expect(await buscarHistorico()).toEqual({ ok: true, historico })
    expect(fetchFalso.mock.calls[0][0]).toBe('http://api.test/admin/historico')
  })

  it('avisa quando a api não responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('falhou')))

    const resultado = await buscarHistorico()

    expect(resultado.ok).toBe(false)
  })
})

describe('adicionarExtrato', () => {
  it('manda o arquivo para o histórico do admin e devolve o que aconteceu', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const corpo = { transacoesNovas: 3, duplicadas: 0, fechamento: 'Fechamento de 2026-10 enviado por e-mail.' }
    const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify(corpo), { status: 200 }))
    vi.stubGlobal('fetch', fetchFalso)
    const arquivo = new File(['x'], 'outubro.ofx')

    expect(await adicionarExtrato(arquivo)).toEqual({ ok: true, ...corpo })
    const [url, opcoes] = fetchFalso.mock.calls[0]
    expect(url).toBe('http://api.test/admin/extratos')
    expect((opcoes.body as FormData).get('arquivo')).toBe(arquivo)
  })

  it('devolve a linha quando o arquivo é inválido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Data inválida.', linha: 4 }), { status: 422 })))

    expect(await adicionarExtrato(new File([''], 'a.csv'))).toEqual({ ok: false, mensagem: 'Data inválida. (linha 4)' })
  })
})

describe('enviarFechamento', () => {
  it('envia o fechamento do mês, com ou sem forçar', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify({ mensagem: 'Enviado.' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchFalso)

    expect(await enviarFechamento({ ano: 2026, mes: 10 }, true)).toEqual({ ok: true, mensagem: 'Enviado.' })
    expect(fetchFalso.mock.calls[0][0]).toBe('http://api.test/admin/fechamento?mes=2026-10&forcar=true')
    expect(fetchFalso.mock.calls[0][1].method).toBe('POST')
  })

  it('avisa quando o mês já tinha sido enviado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Já tinha sido enviado.' }), { status: 409 })))

    expect(await enviarFechamento({ ano: 2026, mes: 10 })).toEqual({ ok: false, mensagem: 'Já tinha sido enviado.', jaEnviado: true })
  })
})

describe('corrigirCategoria', () => {
  it('guarda a categoria escolhida para a descrição', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const fetchFalso = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchFalso)

    expect(await corrigirCategoria('Pix enviado Joao', 'Moradia')).toEqual({ ok: true })
    const [url, opcoes] = fetchFalso.mock.calls[0]
    expect(url).toBe('http://api.test/admin/categorias')
    expect(opcoes.method).toBe('PUT')
    expect(JSON.parse(opcoes.body as string)).toEqual({ descricao: 'Pix enviado Joao', categoria: 'Moradia' })
  })
})

describe('acesso', () => {
  it('pede o código e confirma, sempre com o cookie e o cabeçalho do admin', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const fetchFalso = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchFalso)

    expect(await pedirCodigo('eu@exemplo.com')).toEqual({ ok: true })
    expect(await confirmarCodigo('123456')).toEqual({ ok: true })

    const [[urlDoCodigo, codigo], [urlDaConfirmacao, confirmacao]] = fetchFalso.mock.calls
    expect(urlDoCodigo).toBe('http://api.test/admin/acesso/codigo')
    expect(JSON.parse(codigo.body)).toEqual({ email: 'eu@exemplo.com' })
    expect(codigo.credentials).toBe('include')
    expect(urlDaConfirmacao).toBe('http://api.test/admin/acesso/confirmar')
    expect(JSON.parse(confirmacao.body)).toEqual({ codigo: '123456' })
  })

  it('mostra a mensagem do código errado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'O código não confere.' }), { status: 400 })))

    expect(await confirmarCodigo('000000')).toEqual({ ok: false, mensagem: 'O código não confere.' })
  })

  it('sabe se a sessão está aberta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })).mockResolvedValueOnce(new Response(null, { status: 401 })))

    expect(await sessaoAberta()).toBe(true)
    expect(await sessaoAberta()).toBe(false)
  })
})

describe('apagar', () => {
  it('apaga uma transação pelo dia, valor e descrição', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify({ apagadas: 1 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchFalso)

    expect(await apagarTransacao({ data: '2026-10-05', valor: -123.45, descricao: 'Mercado & Cia' })).toEqual({ ok: true, apagadas: 1 })
    const [url, opcoes] = fetchFalso.mock.calls[0]
    expect(url).toBe('http://api.test/admin/transacoes/apagar')
    expect(opcoes.method).toBe('POST')
    expect(JSON.parse(opcoes.body)).toEqual({ data: '2026-10-05', valor: -123.45, descricao: 'Mercado & Cia' })
  })

  it('apaga um mês inteiro', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify({ apagadas: 7 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchFalso)

    expect(await apagarMes({ ano: 2026, mes: 3 })).toEqual({ ok: true, apagadas: 7 })
    expect(fetchFalso.mock.calls[0][0]).toBe('http://api.test/admin/meses/2026-03')
  })

  it('sem sessão, avisa para entrar de novo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Entre com o código.' }), { status: 401 })))

    expect(await apagarMes({ ano: 2026, mes: 3 })).toEqual({ ok: false, mensagem: 'Entre com o código.' })
  })
})

describe('adicionarFatura', () => {
  it('manda a senha no corpo, nunca na url', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify({ transacoesNovas: 5, duplicadas: 0 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchFalso)

    expect(await adicionarFatura(new File(['x'], 'nov.pdf'), 'segredo')).toEqual({ ok: true, transacoesNovas: 5, duplicadas: 0 })
    const [url, opcoes] = fetchFalso.mock.calls[0]
    expect(url).toBe('http://api.test/admin/faturas')
    expect((opcoes.body as FormData).get('senha')).toBe('segredo')
  })

  it('avisa quando o pdf pede senha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Tem senha.' }), { status: 423 })))

    expect(await adicionarFatura(new File(['x'], 'nov.pdf'), '')).toEqual({ ok: false, mensagem: 'Tem senha.', pedeSenha: true })
  })
})

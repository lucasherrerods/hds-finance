import {
  CreditCard,
  Database,
  FileDown,
  LogOut,
  FileText,
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Tags,
  TrendingUp,
  Upload,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  AdicionarExtrato,
  apagarMes,
  apagarTransacao,
  buscarHistorico,
  corrigirCategoria,
  esquecerAnalises,
  mudarCategoria,
  ocultarTransacao,
  sair,
  sessaoAberta,
  type Historico,
} from '../../modules/admin'
import { periodoDosMeses, type EdicaoDoHistorico } from '../../modules/dashboard'
import { comAjuste, enviarExtrato, iguaisA, type Ajuste, type TransacaoCategorizada } from '../../modules/import'
import { BotaoDeTema, formatarMesCurto } from '../../shared'
import { useResultado } from '../contextoDoResultado'
import { ContextoDoDashboard, type DadosDoDashboard } from './contextoDoDashboard'

const secoes: { caminho: string; rotulo: string; icone: LucideIcon }[] = [
  { caminho: '', rotulo: 'Visão geral', icone: LayoutDashboard },
  { caminho: '/evolucao', rotulo: 'Evolução', icone: TrendingUp },
  { caminho: '/transacoes', rotulo: 'Transações', icone: ReceiptText },
  { caminho: '/categorias', rotulo: 'Categorias', icone: Tags },
  { caminho: '/investimentos', rotulo: 'Investimentos', icone: PiggyBank },
]

// A demonstração não lê fatura.
const secoesDoAdmin = [...secoes, { caminho: '/cartao', rotulo: 'Cartões', icone: CreditCard }]

const SUAVE = [0.22, 1, 0.36, 1] as const
const acaoDoTopo = 'h-10 rounded-full bg-primaria px-4 font-semibold text-primaria-texto transition-transform hover:-translate-y-0.5'
const iconeDoTopo = 'grid size-10 place-items-center rounded-full text-texto-suave transition-colors hover:bg-superficie hover:text-texto'

/** A demonstração mora em /dashboard; a área admin, em /admin. As seções são as mesmas. */
export function LayoutDoDashboard({ modo }: { modo: 'demonstracao' | 'admin' }) {
  return modo === 'admin' ? <DashboardDoAdmin /> : <DashboardDaDemonstracao />
}

/** Demonstração: o extrato enviado vive só na memória da aba. Trocar o extrato esquece tudo. */
function DashboardDaDemonstracao() {
  const { resultado, definir, esquecer } = useResultado()
  const navegar = useNavigate()
  const [aviso, setAviso] = useState<Aviso | null>(null)
  // Clicar rápido em duas transações não pode perder a primeira mudança nem mostrar a resposta atrasada.
  const ajustesAtuais = useRef<Ajuste[]>(resultado?.ajustes ?? [])
  const confirmados = useRef<Ajuste[]>(resultado?.ajustes ?? [])
  const pedido = useRef(0)
  if (!resultado) return <Navigate to="/testar" replace />

  const { resumo, arquivos, ajustes } = resultado

  async function ajustar(transacoes: TransacaoCategorizada[], mudanca: Omit<Ajuste, 'chave'>, depois: Aviso) {
    const novos = comAjuste(ajustesAtuais.current, transacoes.map((t) => t.chave ?? ''), mudanca)
    ajustesAtuais.current = novos
    const meu = ++pedido.current
    setAviso({ texto: 'Refazendo as contas…' })
    const resposta = await enviarExtrato(arquivos, novos)
    if (meu !== pedido.current) return
    if (!resposta.ok) {
      ajustesAtuais.current = confirmados.current
      return setAviso({ texto: resposta.mensagem })
    }
    confirmados.current = novos
    definir({ resumo: resposta.resumo, arquivos, ajustes: novos })
    setAviso(depois)
  }

  function aoMudar(transacao: TransacaoCategorizada, categoria: string) {
    const iguais = iguaisA(transacao, resumo.transacoes)
    void ajustar([transacao], { categoria }, {
      texto: `"${transacao.descricao}" agora é ${categoria}.`,
      acao:
        iguais.length > 1
          ? {
              rotulo: `Aplicar às ${iguais.length} iguais`,
              aoClicar: () => void ajustar(iguais, { categoria }, { texto: `"${transacao.descricao}" agora é ${categoria} em todas.` }),
            }
          : undefined,
    })
  }

  function aoOcultar(transacao: TransacaoCategorizada, oculta: boolean) {
    void ajustar([transacao], { oculta }, {
      texto: oculta ? `"${transacao.descricao}" não entra mais nas somas.` : `"${transacao.descricao}" voltou para as somas.`,
      acao: oculta ? { rotulo: 'Desfazer', aoClicar: () => aoOcultar(transacao, false) } : undefined,
    })
  }

  function trocarExtrato() {
    esquecer()
    navegar('/testar')
  }

  return (
    <Moldura
      base="/dashboard"
      dados={{ ...resumo, quantidade: resumo.transacoesNovas }}
      arquivos={arquivos}
      ajustes={ajustes}
      edicao={{ categorias: resumo.categorias ?? [], grupos: resumo.grupos, aoMudar, aoOcultar }}
      aviso={aviso}
      fecharAviso={() => setAviso(null)}
      origem={{ icone: FileText, nome: arquivos.map((a) => a.name).join(', ') }}
      acao={
        <button type="button" onClick={trocarExtrato} className={`flex items-center gap-2 ${acaoDoTopo}`}>
          <Upload aria-hidden className="size-4" />
          <span className="sr-only sm:not-sr-only">Trocar extrato</span>
        </button>
      }
      rodape="Nada fica guardado. Ao fechar a aba, tudo some."
    />
  )
}

type Aviso = { texto: string; acao?: { rotulo: string; aoClicar: () => void } }

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'sem-sessao' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; historico: Historico }

/** Área admin: o histórico vem do Postgres, e cada extrato incluído soma ao que já existe. Sem sessão, volta para a entrada. */
function DashboardDoAdmin() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const [aviso, setAviso] = useState<Aviso | null>(null)
  // Cada mudança no histórico muda a versão, e o efeito busca o histórico de novo.
  const [versao, setVersao] = useState(0)
  const navegar = useNavigate()

  useEffect(() => {
    let ativo = true
    sessaoAberta().then(async (aberta) => {
      if (!ativo) return
      if (!aberta) return setEstado({ tipo: 'sem-sessao' })
      const resultado = await buscarHistorico()
      if (!ativo) return
      setEstado(resultado.ok ? { tipo: 'pronto', historico: resultado.historico } : { tipo: 'erro', mensagem: resultado.mensagem })
    })
    return () => {
      ativo = false
    }
  }, [versao])

  const mostrar = (texto: string, acao?: Aviso['acao']) => setAviso({ texto, acao })

  function mudou(mensagem: string, acao?: Aviso['acao']) {
    mostrar(mensagem, acao)
    esquecerAnalises()
    setVersao((v) => v + 1)
  }

  async function aoMudarCategoria(transacao: TransacaoCategorizada, categoria: string) {
    const resultado = await mudarCategoria(transacao.chave ?? '', categoria)
    if (!resultado.ok) return mostrar(resultado.mensagem)
    const podeAplicar = transacao.valor < 0 || transacao.noCartao
    mudou(
      `"${transacao.descricao}" agora é ${categoria}.`,
      podeAplicar ? { rotulo: 'Aplicar a todas as iguais', aoClicar: () => void aplicarAsIguais(transacao, categoria) } : undefined,
    )
  }

  async function aplicarAsIguais(transacao: TransacaoCategorizada, categoria: string) {
    const resultado = await corrigirCategoria(transacao.descricao, categoria)
    if (!resultado.ok) return mostrar(resultado.mensagem)
    // Sem a escolha própria, ela segue a regra da descrição como as outras.
    await mudarCategoria(transacao.chave ?? '', null)
    mudou(`"${transacao.descricao}" agora é ${categoria} em todas, aqui e nas próximas importações.`)
  }

  async function aoOcultar(transacao: TransacaoCategorizada, oculta: boolean) {
    const resultado = await ocultarTransacao(transacao.chave ?? '', oculta)
    if (!resultado.ok) return mostrar(resultado.mensagem)
    mudou(
      oculta ? `"${transacao.descricao}" não entra mais nas somas.` : `"${transacao.descricao}" voltou para as somas.`,
      oculta ? { rotulo: 'Desfazer', aoClicar: () => void aoOcultar(transacao, false) } : undefined,
    )
  }

  async function aoApagar(transacao: { data: string; valor: number; descricao: string }) {
    if (!window.confirm(`Apagar "${transacao.descricao}" do histórico?`)) return
    const resultado = await apagarTransacao(transacao)
    if (resultado.ok) mudou(`"${transacao.descricao}" saiu do histórico.`)
    else mostrar(resultado.mensagem)
  }

  async function aoApagarMes(mes: { ano: number; mes: number }) {
    const nome = formatarMesCurto(mes.ano, mes.mes)
    if (!window.confirm(`Apagar todas as transações de ${nome}? Não dá para desfazer.`)) return
    const resultado = await apagarMes(mes)
    if (resultado.ok) mudou(`${nome} saiu do histórico (${resultado.apagadas} transações).`)
    else mostrar(resultado.mensagem)
  }

  async function sairDaConta() {
    await sair()
    navegar('/admin/entrar', { replace: true })
  }

  if (estado.tipo === 'sem-sessao') return <Navigate to="/admin/entrar" replace />
  if (estado.tipo === 'carregando') return <TelaCheia>Lendo o histórico…</TelaCheia>
  if (estado.tipo === 'erro') return <TelaCheia><span role="alert">{estado.mensagem}</span></TelaCheia>

  const { historico } = estado
  const botaoDeIncluir = (rotulo?: string, className = acaoDoTopo) => (
    <AdicionarExtrato aoImportar={(mensagem) => mudou(mensagem)} rotulo={rotulo} className={className} />
  )

  if (historico.meses.length === 0) {
    return (
      <TelaCheia>
        <h1 className="text-4xl font-bold tracking-[-0.03em] text-texto">Nenhum extrato ainda</h1>
        <span>O histórico fica guardado só para você, no banco da área admin.</span>
        {botaoDeIncluir('Incluir o primeiro extrato', 'rounded-full bg-primaria px-6 py-3 font-semibold text-primaria-texto')}
        {aviso && <span role="status">{aviso.texto}</span>}
      </TelaCheia>
    )
  }

  return (
    <Moldura
      base="/admin"
      dados={{ ...historico, quantidade: historico.transacoes.length }}
      arquivos={null}
      aoHistoricoMudar={mudou}
      edicao={{
        categorias: historico.categorias,
        grupos: historico.grupos,
        aoMudar: (transacao, categoria) => void aoMudarCategoria(transacao, categoria),
        aoOcultar: (transacao, oculta) => void aoOcultar(transacao, oculta),
        aoApagar: (transacao) => void aoApagar(transacao),
        aoApagarMes: (mes) => void aoApagarMes(mes),
      }}
      origem={{ icone: Database, nome: 'Seu histórico' }}
      acao={
        botaoDeIncluir()
      }
      sair={
        <button type="button" onClick={() => void sairDaConta()} aria-label="Sair" title="Sair" className={iconeDoTopo}>
          <LogOut aria-hidden className="size-5" />
        </button>
      }
      rodape={`© ${new Date().getFullYear()} hds finance · admin`}
      aviso={aviso}
      fecharAviso={() => setAviso(null)}
    />
  )
}

function TelaCheia({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center text-lg text-texto-suave">{children}</div>
  )
}

type MolduraProps = {
  base: '/dashboard' | '/admin'
  dados: DadosDoDashboard
  arquivos: File[] | null
  ajustes?: Ajuste[]
  edicao?: EdicaoDoHistorico
  aoHistoricoMudar?: (mensagem: string) => void
  origem: { icone: LucideIcon; nome: string }
  acao: ReactNode
  sair?: ReactNode
  rodape: string
  aviso?: Aviso | null
  fecharAviso?: () => void
}

/** Cabeçalho no topo, abas centralizadas e a seção da rota abaixo. */
function Moldura({ base, dados, arquivos, ajustes, edicao, aoHistoricoMudar, origem, acao, sair, rodape, aviso, fecharAviso }: MolduraProps) {
  const { pathname } = useLocation()
  const IconeDaOrigem = origem.icone

  return (
    <ContextoDoDashboard.Provider value={{ dados, arquivos, ajustes, edicao, aoHistoricoMudar }}>
      <div className="relative isolate min-h-svh">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-64 -z-10 mx-auto h-[28rem] max-w-4xl rounded-full bg-brilho opacity-60 blur-[120px]"
        />
        <header className="sticky top-0 z-20 border-b border-borda bg-fundo/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Wallet aria-hidden className="size-5 text-primaria" />
              hds finance
            </Link>
            <div className="flex items-center gap-3 text-sm">
              {acao}
              <div className="flex items-center">
                <NavLink
                  to={`${base}/relatorio`}
                  aria-label="Relatório"
                  title="Relatório"
                  className={({ isActive }) => `${iconeDoTopo} ${isActive ? 'bg-primaria-suave text-primaria' : ''}`}
                >
                  <FileDown aria-hidden className="size-5" />
                </NavLink>
                <BotaoDeTema className="size-10 justify-center rounded-full" />
                {sair}
              </div>
            </div>
          </div>
        </header>

        <nav aria-label="Seções do dashboard" className="overflow-x-auto px-4 pt-8 pb-1 [scrollbar-width:none] sm:px-6">
          <ul className="mx-auto flex w-max gap-2">
            {(base === '/admin' ? secoesDoAdmin : secoes).map(({ caminho, rotulo, icone: Icone }) => (
              <li key={caminho}>
                <NavLink
                  to={`${base}${caminho}`}
                  end
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 rounded-full border px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                      isActive
                        ? 'border-primaria/50 font-medium text-primaria'
                        : 'border-borda text-texto hover:border-primaria/40'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="aba-ativa"
                          className="absolute inset-0 rounded-full bg-primaria-suave"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        />
                      )}
                      <Icone aria-hidden className="relative size-4 opacity-80" />
                      <span className="relative">{rotulo}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <p className="flex items-center justify-center gap-2 px-4 pt-4 text-sm text-texto-suave">
          <IconeDaOrigem aria-hidden className="size-4 shrink-0 opacity-60" />
          <span className="max-w-[16rem] truncate">{origem.nome}</span>
          <span aria-hidden>·</span>
          <span>
            {periodoDosMeses(dados.meses)} · {dados.quantidade} transações
          </span>
        </p>

        <main className="min-w-0 px-4 py-8 sm:px-6 lg:py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8">
            <AnimatePresence>
              {aviso && (
                <motion.p
                  role="status"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start justify-between gap-4 rounded-xl bg-primaria-suave p-4 text-texto"
                >
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {aviso.texto}
                    {aviso.acao && (
                      <button type="button" onClick={aviso.acao.aoClicar} className="font-medium text-primaria underline underline-offset-4">
                        {aviso.acao.rotulo}
                      </button>
                    )}
                  </span>
                  <button type="button" onClick={fecharAviso} aria-label="Fechar aviso" className="text-texto-suave hover:text-texto">
                    <X aria-hidden className="size-4" />
                  </button>
                </motion.p>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                className="flex flex-col gap-8"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: SUAVE }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
            <p className="flex items-center justify-center gap-2 pt-4 text-sm text-texto-suave">
              <ShieldCheck aria-hidden className="size-4 shrink-0 opacity-70" />
              {rodape}
            </p>
          </div>
        </main>
      </div>
    </ContextoDoDashboard.Provider>
  )
}

import {
  Database,
  FileDown,
  FileText,
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  Upload,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { periodoDosMeses } from '../../modules/dashboard'
import { AdicionarExtrato, buscarHistorico, type Historico } from '../../modules/history'
import { BotaoDeTema, emModoPessoal } from '../../shared'
import { useResultado } from '../contextoDoResultado'
import { ContextoDoDashboard, type DadosDoDashboard } from './contextoDoDashboard'

const secoes: { caminho: string; rotulo: string; icone: LucideIcon }[] = [
  { caminho: '/dashboard', rotulo: 'Visão geral', icone: LayoutDashboard },
  { caminho: '/dashboard/evolucao', rotulo: 'Evolução', icone: TrendingUp },
  { caminho: '/dashboard/transacoes', rotulo: 'Transações', icone: ReceiptText },
  { caminho: '/dashboard/investimentos', rotulo: 'Investimentos', icone: PiggyBank },
  { caminho: '/dashboard/relatorio', rotulo: 'Relatório', icone: FileDown },
]

const SUAVE = [0.22, 1, 0.36, 1] as const
const acaoDaSidebar = 'text-texto-suave hover:bg-fundo hover:text-texto'

export function LayoutDoDashboard() {
  return emModoPessoal() ? <DashboardPessoal /> : <DashboardDaDemonstracao />
}

/** Demonstração: o extrato enviado vive só na memória da aba. Trocar o extrato esquece tudo. */
function DashboardDaDemonstracao() {
  const { resultado, esquecer } = useResultado()
  const navegar = useNavigate()
  if (!resultado) return <Navigate to="/testar" replace />

  const { resumo, arquivo } = resultado
  function trocarExtrato() {
    esquecer()
    navegar('/testar')
  }

  return (
    <Moldura
      dados={{ ...resumo, quantidade: resumo.transacoesNovas }}
      arquivo={arquivo}
      origem={{ icone: FileText, nome: arquivo.name }}
      acao={
        <button type="button" onClick={trocarExtrato} className={`flex w-full items-center gap-3 rounded-lg p-2 ${acaoDaSidebar}`}>
          <Upload aria-hidden className="size-5" />
          Trocar extrato
        </button>
      }
      rodape="Nada fica guardado. Ao fechar a aba, tudo some."
    />
  )
}

type Estado = { tipo: 'carregando' } | { tipo: 'erro'; mensagem: string } | { tipo: 'pronto'; historico: Historico }

/** Modo pessoal: o dashboard lê o histórico do SQLite local, e cada extrato adicionado soma ao que já existe. */
function DashboardPessoal() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const [aviso, setAviso] = useState<string | null>(null)
  // Cada extrato importado muda a versão, e o efeito busca o histórico de novo.
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    buscarHistorico().then((resultado) => {
      if (!ativo) return
      setEstado(resultado.ok ? { tipo: 'pronto', historico: resultado.historico } : { tipo: 'erro', mensagem: resultado.mensagem })
    })
    return () => {
      ativo = false
    }
  }, [versao])

  function aoImportar(mensagem: string) {
    setAviso(mensagem)
    setVersao((v) => v + 1)
  }

  if (estado.tipo === 'carregando') return <TelaCheia>Lendo o histórico local…</TelaCheia>
  if (estado.tipo === 'erro') {
    return (
      <TelaCheia>
        <span role="alert">{estado.mensagem}</span>
        <span className="text-base">Confira se a api está rodando com Modo=Pessoal.</span>
      </TelaCheia>
    )
  }

  const { historico } = estado
  if (historico.meses.length === 0) {
    return (
      <TelaCheia>
        <h1 className="text-4xl font-bold tracking-[-0.03em] text-texto">Nenhum extrato ainda</h1>
        <span>O histórico fica só nesta máquina, no SQLite local.</span>
        <AdicionarExtrato aoImportar={aoImportar} rotulo="Adicionar o primeiro extrato" className="bg-primaria px-6 py-3 font-medium text-primaria-texto" />
      </TelaCheia>
    )
  }

  return (
    <Moldura
      dados={{ ...historico, quantidade: historico.transacoes.length }}
      arquivo={null}
      origem={{ icone: Database, nome: 'Histórico local' }}
      acao={<AdicionarExtrato aoImportar={aoImportar} className={acaoDaSidebar} />}
      rodape="Guardado só nesta máquina, no SQLite local."
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
  dados: DadosDoDashboard
  arquivo: File | null
  origem: { icone: LucideIcon; nome: string }
  acao: ReactNode
  rodape: string
  aviso?: string | null
  fecharAviso?: () => void
}

/** Sidebar fixa no computador, barra no topo no celular, e a seção da rota ao lado. */
function Moldura({ dados, arquivo, origem, acao, rodape, aviso, fecharAviso }: MolduraProps) {
  const { pathname } = useLocation()
  const IconeDaOrigem = origem.icone

  return (
    <ContextoDoDashboard.Provider value={{ dados, arquivo }}>
      <div className="min-h-svh lg:grid lg:grid-cols-[17rem_1fr]">
        <aside className="sticky top-0 z-10 flex flex-col gap-4 bg-superficie p-4 lg:h-svh lg:gap-8 lg:p-6">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Wallet aria-hidden className="size-5 text-primaria" />
              hds finance
            </Link>
            <div className="flex items-center gap-1 text-sm lg:hidden">
              <BotaoDeTema />
              {acao}
            </div>
          </div>

          <div className="hidden flex-col gap-1 rounded-xl bg-fundo p-4 lg:flex">
            <span className="flex min-w-0 items-center gap-2 font-medium">
              <IconeDaOrigem aria-hidden className="size-4 shrink-0 opacity-60" />
              <span className="truncate">{origem.nome}</span>
            </span>
            <span className="text-sm text-texto-suave">
              {periodoDosMeses(dados.meses)} · {dados.quantidade} transações
            </span>
          </div>

          <nav aria-label="Seções do dashboard" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
            <ul className="flex gap-1 lg:flex-col">
              {secoes.map(({ caminho, rotulo, icone: Icone }) => (
                <li key={caminho}>
                  <NavLink
                    to={caminho}
                    end
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 rounded-lg px-3 py-2 whitespace-nowrap transition-colors ${
                        isActive ? 'font-medium text-primaria' : 'text-texto-suave hover:text-texto'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId="item-ativo"
                            className="absolute inset-0 rounded-lg bg-primaria-suave"
                            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                          />
                        )}
                        <Icone aria-hidden className="relative size-5" />
                        <span className="relative">{rotulo}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-auto hidden flex-col gap-2 lg:flex">
            <BotaoDeTema comRotulo className="hover:bg-fundo" />
            {acao}
            <p className="flex gap-2 pt-2 text-sm text-texto-suave">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 opacity-70" />
              {rodape}
            </p>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-8">
            <AnimatePresence>
              {aviso && (
                <motion.p
                  role="status"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start justify-between gap-4 rounded-xl bg-primaria-suave p-4 text-texto"
                >
                  {aviso}
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
          </div>
        </main>
      </div>
    </ContextoDoDashboard.Provider>
  )
}

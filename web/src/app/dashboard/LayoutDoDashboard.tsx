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
import { periodoDosMeses, type EdicaoDeCategoria } from '../../modules/dashboard'
import { AdicionarExtrato, buscarHistorico, corrigirCategoria, type Historico } from '../../modules/history'
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
const acaoDoTopo = 'rounded-full border border-borda px-3 py-1 text-texto-suave hover:border-primaria hover:text-texto'

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
        <button type="button" onClick={trocarExtrato} className={`flex items-center gap-2 ${acaoDoTopo}`}>
          <Upload aria-hidden className="size-4" />
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

  async function aoMudarCategoria(descricao: string, categoria: string) {
    const resultado = await corrigirCategoria(descricao, categoria)
    setAviso(resultado.ok ? `"${descricao}" agora é ${categoria}, aqui e nas próximas importações.` : resultado.mensagem)
    if (resultado.ok) setVersao((v) => v + 1)
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
      edicao={{ categorias: historico.categorias, aoMudar: (descricao, categoria) => void aoMudarCategoria(descricao, categoria) }}
      origem={{ icone: Database, nome: 'Histórico local' }}
      acao={<AdicionarExtrato aoImportar={aoImportar} className={acaoDoTopo} />}
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
  edicao?: EdicaoDeCategoria
  origem: { icone: LucideIcon; nome: string }
  acao: ReactNode
  rodape: string
  aviso?: string | null
  fecharAviso?: () => void
}

/** Cabeçalho no topo, abas centralizadas e a seção da rota abaixo. */
function Moldura({ dados, arquivo, edicao, origem, acao, rodape, aviso, fecharAviso }: MolduraProps) {
  const { pathname } = useLocation()
  const IconeDaOrigem = origem.icone

  return (
    <ContextoDoDashboard.Provider value={{ dados, arquivo, edicao }}>
      <div className="relative isolate min-h-svh">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-64 -z-10 mx-auto h-[28rem] max-w-4xl rounded-full bg-brilho opacity-60 blur-[120px]"
        />
        <header className="sticky top-0 z-20 border-b border-borda bg-fundo/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Wallet aria-hidden className="size-5 text-primaria" />
              hds finance
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden min-w-0 items-center gap-2 rounded-full border border-borda bg-superficie px-3 py-1 text-texto-suave md:flex">
                <IconeDaOrigem aria-hidden className="size-4 shrink-0 opacity-60" />
                <span className="max-w-[16rem] truncate">{origem.nome}</span>
                <span aria-hidden>·</span>
                <span className="whitespace-nowrap">
                  {periodoDosMeses(dados.meses)} · {dados.quantidade} transações
                </span>
              </span>
              <BotaoDeTema />
              {acao}
            </div>
          </div>
        </header>

        <nav aria-label="Seções do dashboard" className="overflow-x-auto px-4 pt-8 sm:px-6">
          <ul className="mx-auto flex w-max gap-2">
            {secoes.map(({ caminho, rotulo, icone: Icone }) => (
              <li key={caminho}>
                <NavLink
                  to={caminho}
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
                          className="absolute inset-0 rounded-full bg-primaria-suave shadow-[0_0_24px_var(--color-brilho)]"
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

        <main className="min-w-0 px-4 py-8 sm:px-6 lg:py-10">
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

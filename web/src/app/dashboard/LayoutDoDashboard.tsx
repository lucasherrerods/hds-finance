import { FileDown, FileText, LayoutDashboard, PiggyBank, ReceiptText, ShieldCheck, TrendingUp, Upload, Wallet, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { periodoDosMeses } from '../../modules/dashboard'
import { BotaoDeTema } from '../../shared'
import { useResultado } from '../contextoDoResultado'

const secoes: { caminho: string; rotulo: string; icone: LucideIcon }[] = [
  { caminho: '/dashboard', rotulo: 'Visão geral', icone: LayoutDashboard },
  { caminho: '/dashboard/evolucao', rotulo: 'Evolução', icone: TrendingUp },
  { caminho: '/dashboard/transacoes', rotulo: 'Transações', icone: ReceiptText },
  { caminho: '/dashboard/investimentos', rotulo: 'Investimentos', icone: PiggyBank },
  { caminho: '/dashboard/relatorio', rotulo: 'Relatório', icone: FileDown },
]

const SUAVE = [0.22, 1, 0.36, 1] as const

/** O dashboard do extrato enviado: sidebar fixa no computador, barra no topo no celular. */
export function LayoutDoDashboard() {
  const { resultado, esquecer } = useResultado()
  const navegar = useNavigate()
  const { pathname } = useLocation()

  if (!resultado) return <Navigate to="/testar" replace />

  const { resumo, arquivo } = resultado

  function trocarExtrato() {
    esquecer()
    navegar('/testar')
  }

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 z-10 flex flex-col gap-4 bg-superficie p-4 lg:h-svh lg:gap-8 lg:p-6">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Wallet aria-hidden className="size-5 text-primaria" />
            hds finance
          </Link>
          <div className="flex items-center gap-1 lg:hidden">
            <BotaoDeTema />
            <button
              type="button"
              onClick={trocarExtrato}
              aria-label="Trocar extrato"
              className="rounded-lg p-2 text-texto-suave transition-colors hover:bg-fundo hover:text-texto"
            >
              <Upload aria-hidden className="size-5" />
            </button>
          </div>
        </div>

        <div className="hidden flex-col gap-1 rounded-xl bg-fundo p-4 lg:flex">
          <span className="flex min-w-0 items-center gap-2 font-medium">
            <FileText aria-hidden className="size-4 shrink-0 opacity-60" />
            <span className="truncate">{arquivo.name}</span>
          </span>
          <span className="text-sm text-texto-suave">
            {periodoDosMeses(resumo.meses)} · {resumo.transacoesNovas} transações
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
                          className="absolute inset-0 -z-0 rounded-lg bg-primaria-suave"
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
          <button
            type="button"
            onClick={trocarExtrato}
            className="flex items-center gap-3 rounded-lg p-2 text-texto-suave transition-colors hover:bg-fundo hover:text-texto"
          >
            <Upload aria-hidden className="size-5" />
            Trocar extrato
          </button>
          <p className="flex gap-2 pt-2 text-sm text-texto-suave">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 opacity-70" />
            Nada fica guardado. Ao fechar a aba, tudo some.
          </p>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            className="mx-auto flex max-w-6xl flex-col gap-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: SUAVE }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

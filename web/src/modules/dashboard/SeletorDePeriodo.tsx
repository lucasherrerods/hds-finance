import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { formatarData, formatarMes } from '../../shared'
import { dentroDo, rotuloDoIntervalo, semanasDoMes, type Atalho, type Intervalo } from './intervalo'

export type Escolha = { intervalo: Intervalo; rotulo: string }

type Props = { escolha: Escolha; atalhos: Atalho[]; aoAplicar: (escolha: Escolha) => void }

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

const mesSeguinte = ({ ano, mes }: { ano: number; mes: number }, passo: number) => {
  const total = ano * 12 + (mes - 1) + passo
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 }
}

/** Atalhos à esquerda e dois meses de calendário. A escolha só vale ao clicar em Aplicar. */
export function SeletorDePeriodo({ escolha, atalhos, aoAplicar }: Props) {
  const [aberto, setAberto] = useState(false)
  const [rascunho, setRascunho] = useState(escolha)
  // Com o início escolhido e o fim ainda não, o próximo clique fecha o intervalo.
  const [pontaAberta, setPontaAberta] = useState(false)
  const [vista, setVista] = useState(() => mesSeguinte(mesDe(escolha.intervalo.fim), -1))
  const caixa = useRef<HTMLDivElement>(null)
  const idDoPainel = useId()

  useEffect(() => {
    if (!aberto) return
    const fora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  function abrir() {
    setRascunho(escolha)
    setPontaAberta(false)
    setVista(mesSeguinte(mesDe(escolha.intervalo.fim), -1))
    setAberto(!aberto)
  }

  function escolherDia(dia: string) {
    if (!pontaAberta) {
      setRascunho({ intervalo: { inicio: dia, fim: dia }, rotulo: formatarData(dia) })
      setPontaAberta(true)
      return
    }
    const { inicio } = rascunho.intervalo
    const intervalo = dia < inicio ? { inicio: dia, fim: inicio } : { inicio, fim: dia }
    setRascunho({ intervalo, rotulo: rotuloDoIntervalo(intervalo) })
    setPontaAberta(false)
  }

  function escolherAtalho(atalho: Atalho) {
    setRascunho({ intervalo: atalho.intervalo, rotulo: atalho.rotulo })
    setPontaAberta(false)
    setVista(mesSeguinte(mesDe(atalho.intervalo.fim), -1))
  }

  return (
    <div ref={caixa} className="relative col-span-2 lg:col-span-1">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={idDoPainel}
        aria-label={`Período: ${escolha.rotulo}`}
        onClick={abrir}
        className="flex h-10 w-full items-center gap-2 rounded-full border border-borda bg-fundo pr-4 pl-4 text-texto transition-colors hover:border-primaria/40 lg:w-auto lg:min-w-56"
      >
        <CalendarDays aria-hidden className="size-4 opacity-70" />
        <span className="truncate">{escolha.rotulo}</span>
        <ChevronDown aria-hidden className="ml-auto size-4 opacity-70" />
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            id={idDoPainel}
            role="dialog"
            aria-label="Escolher período"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute top-12 left-0 z-30 flex w-[min(42rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-borda bg-superficie"
          >
            <div className="flex flex-col md:flex-row">
              <ul aria-label="Atalhos" className="flex gap-2 overflow-x-auto border-b border-borda p-4 [scrollbar-width:none] md:w-44 md:shrink-0 md:flex-col md:gap-1 md:border-r md:border-b-0">
                {atalhos.map((a) => {
                  const ativo = rascunho.rotulo === a.rotulo
                  return (
                    <li key={a.chave} className="shrink-0">
                      <button
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => escolherAtalho(a)}
                        className={`w-full rounded-lg px-4 py-2 text-left text-sm whitespace-nowrap transition-colors ${
                          ativo ? 'bg-fundo font-medium text-texto' : 'text-texto-suave hover:bg-fundo hover:text-texto'
                        }`}
                      >
                        {a.rotulo}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
                <span className="text-sm text-texto-suave">Ou escolha um período no calendário</span>
                <div className="grid gap-6 sm:grid-cols-2">
                  {[vista, mesSeguinte(vista, 1)].map((m, i) => (
                    <Mes
                      key={`${m.ano}-${m.mes}`}
                      {...m}
                      intervalo={rascunho.intervalo}
                      anterior={() => setVista(mesSeguinte(vista, -1))}
                      seguinte={i === 1 ? () => setVista(mesSeguinte(vista, 1)) : undefined}
                      escondidoNoCelular={i === 0}
                      aoEscolher={escolherDia}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-borda p-4">
              <span className="truncate text-sm text-texto-suave">{rascunho.rotulo}</span>
              <button
                type="button"
                disabled={pontaAberta}
                onClick={() => {
                  aoAplicar(rascunho)
                  setAberto(false)
                }}
                className="flex shrink-0 items-center gap-2 rounded-full bg-primaria px-4 py-2 font-semibold text-primaria-texto transition-opacity disabled:opacity-50"
              >
                <Check aria-hidden className="size-4" />
                Aplicar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const mesDe = (data: string) => ({ ano: Number(data.slice(0, 4)), mes: Number(data.slice(5, 7)) })

type MesProps = {
  ano: number
  mes: number
  intervalo: Intervalo
  anterior?: () => void
  seguinte?: () => void
  escondidoNoCelular: boolean
  aoEscolher: (dia: string) => void
}

function Mes({ ano, mes, intervalo, anterior, seguinte, escondidoNoCelular, aoEscolher }: MesProps) {
  const seta = 'grid size-8 place-items-center rounded-full text-texto-suave transition-colors hover:bg-fundo hover:text-texto'
  return (
    <div className={`flex-col gap-2 ${escondidoNoCelular ? 'hidden sm:flex' : 'flex'}`}>
      <div className="flex h-8 items-center justify-between">
        {/* No celular só o segundo mês aparece, então ele também tem a seta de voltar; no computador ela fica no primeiro. */}
        {anterior ? (
          <button
            type="button"
            aria-label="Meses anteriores"
            onClick={anterior}
            className={`${seta} ${escondidoNoCelular ? '' : 'sm:invisible'}`}
            tabIndex={escondidoNoCelular ? undefined : -1}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
        ) : (
          <span className="size-8" />
        )}
        <span className="font-semibold">{formatarMes(ano, mes)}</span>
        {seguinte ? (
          <button type="button" aria-label="Meses seguintes" onClick={seguinte} className={seta}>
            <ChevronRight aria-hidden className="size-4" />
          </button>
        ) : (
          <span className="size-8" />
        )}
      </div>
      <table className="w-full table-fixed text-center text-sm tabular-nums">
        <thead className="text-texto-suave">
          <tr>
            {DIAS.map((d) => (
              <th key={d} className="pb-2 font-normal">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanasDoMes(ano, mes).map((semana, i) => (
            <tr key={i}>
              {semana.map((dia, j) => {
                if (!dia) return <td key={j} />
                const ponta = dia === intervalo.inicio || dia === intervalo.fim
                const dentro = dentroDo(intervalo, dia)
                return (
                  <td key={j} className={`py-0.5 ${dentro && !ponta ? 'bg-primaria-suave' : ''}`}>
                    <button
                      type="button"
                      aria-label={formatarData(dia)}
                      aria-pressed={dentro}
                      onClick={() => aoEscolher(dia)}
                      className={`mx-auto grid size-8 place-items-center rounded-lg transition-colors ${
                        ponta ? 'bg-primaria font-semibold text-primaria-texto' : 'hover:bg-fundo'
                      }`}
                    >
                      {Number(dia.slice(8))}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

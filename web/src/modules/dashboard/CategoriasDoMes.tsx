import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { formatarMes, formatarMoeda } from '../../shared'
import type { ResumoMensal } from '../import'
import { gruposDoMes, type GrupoDoMes } from './gruposDoMes'
import { IconeDaCategoria } from './IconeDaCategoria'
import { tomDaCategoria } from './iconesDeCategoria'
import { Seta } from './Seta'

// Os grupos se revezam nas cinco cores dos gráficos; o nome vem sempre escrito ao lado.
const CORES = ['var(--color-grafico-1)', 'var(--color-grafico-2)', 'var(--color-grafico-3)', 'var(--color-grafico-4)', 'var(--color-grafico-5)']
const SUAVE = [0.22, 1, 0.36, 1] as const

/** Os gastos de um mês, por grupo, com as categorias de cada grupo abaixo dele. */
export function CategoriasDoMes({ meses }: { meses: ResumoMensal[] }) {
  const [indice, setIndice] = useState(meses.length - 1)
  const mes = meses[Math.min(indice, meses.length - 1)]
  if (!mes) return null
  const grupos = gruposDoMes(mes.gastosPorCategoria)
  const total = grupos.reduce((s, g) => s + g.total, 0)
  const maior = grupos[0]?.total ?? 1
  const nome = formatarMes(mes.ano, mes.mes)

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Total do mês" className="flex flex-col items-center gap-6 rounded-2xl border border-borda bg-superficie p-6 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <span className="text-3xl font-bold tracking-[-0.03em] tabular-nums sm:text-4xl">{formatarMoeda(total)}</span>
          <span className="text-texto-suave">gasto em {nome}</span>
        </div>
        <Rosca grupos={grupos} total={total} />
        <div className="flex items-center gap-1">
          <Seta rotulo="Mês anterior" icone={ChevronLeft} ativa={indice > 0} aoClicar={() => setIndice(indice - 1)} />
          <span className="min-w-40 text-center font-medium first-letter:uppercase">{nome}</span>
          <Seta rotulo="Mês seguinte" icone={ChevronRight} ativa={indice < meses.length - 1} aoClicar={() => setIndice(indice + 1)} />
        </div>
      </section>

      <AnimatePresence mode="wait">
        <motion.section
          key={`${mes.ano}-${mes.mes}`}
          aria-label="Gastos por grupo"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: SUAVE }}
          className="flex flex-col rounded-2xl border border-borda bg-superficie"
        >
          <h2 className="border-b border-borda p-6 text-sm font-medium tracking-wider text-texto-suave uppercase">Categorias</h2>
          {grupos.length === 0 ? (
            <p className="p-6 text-texto-suave">Nenhum gasto neste mês.</p>
          ) : (
            <ul>
              {grupos.map((g, i) => (
                <Grupo key={g.grupo} grupo={g} cor={CORES[i % CORES.length]} maior={maior} />
              ))}
            </ul>
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  )
}

function Barra({ valor, maior, cor }: { valor: number; maior: number; cor: string }) {
  return (
    <span aria-hidden className="hidden h-2 w-24 shrink-0 overflow-hidden rounded-full bg-fundo sm:block md:w-32">
      <motion.span
        className="block h-full rounded-full"
        style={{ backgroundColor: cor }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, (valor / maior) * 100)}%` }}
        transition={{ duration: 0.6, ease: SUAVE }}
      />
    </span>
  )
}

function Grupo({ grupo: g, cor, maior }: { grupo: GrupoDoMes; cor: string; maior: number }) {
  const [aberto, setAberto] = useState(true)
  return (
    <li className="border-b border-borda last:border-0">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
        className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-fundo/50 sm:px-6"
      >
        <ChevronDown aria-hidden className={`size-4 shrink-0 text-texto-suave transition-transform ${aberto ? '' : '-rotate-90'}`} />
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tomDaCategoria(g.grupo, g.grupo)}`}>
          <IconeDaCategoria categoria={g.grupo} grupo={g.grupo} className="size-4 opacity-70" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold">{g.grupo}</span>
          <span className="text-sm text-texto-suave">{g.categorias.length === 1 ? '1 categoria' : `${g.categorias.length} categorias`}</span>
        </span>
        <span className="font-semibold whitespace-nowrap tabular-nums">{formatarMoeda(g.total)}</span>
        <Barra valor={g.total} maior={maior} cor={cor} />
      </button>
      <AnimatePresence initial={false}>
        {aberto && (
          <motion.ul
            aria-label={`Categorias de ${g.grupo}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: SUAVE }}
            className="overflow-hidden"
          >
            {g.categorias.map((c) => (
              <li key={c.categoria} className="flex items-center gap-4 py-3 pr-4 pl-12 sm:pr-6 sm:pl-16">
                <span className="min-w-0 flex-1 border-l border-borda pl-4 text-texto-suave">{c.categoria}</span>
                <span className="whitespace-nowrap text-texto-suave tabular-nums">{formatarMoeda(c.valor)}</span>
                <Barra valor={c.valor} maior={maior} cor={cor} />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  )
}

/** Rosca em SVG puro: cada grupo é um arco proporcional ao gasto. */
function Rosca({ grupos, total }: { grupos: GrupoDoMes[]; total: number }) {
  const raio = 36
  const volta = 2 * Math.PI * raio
  const partes = grupos.map((g) => (total > 0 ? (g.total / total) * volta : 0))
  const inicios = partes.map((_, i) => partes.slice(0, i).reduce((s, p) => s + p, 0))
  return (
    <svg viewBox="0 0 96 96" className="size-24 shrink-0 -rotate-90" aria-hidden>
      <circle cx="48" cy="48" r={raio} fill="none" stroke="var(--color-fundo)" strokeWidth="12" />
      {total > 0 &&
        grupos.map((g, i) => (
            <motion.circle
              key={g.grupo}
              cx="48"
              cy="48"
              r={raio}
              fill="none"
              stroke={CORES[i % CORES.length]}
              strokeWidth="12"
              strokeDasharray={`${partes[i]} ${volta - partes[i]}`}
              initial={{ strokeDashoffset: volta, opacity: 0 }}
              animate={{ strokeDashoffset: -inicios[i], opacity: 1 }}
              transition={{ duration: 0.6, delay: i * 0.04, ease: SUAVE }}
            />
          ))}
    </svg>
  )
}

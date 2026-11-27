import { Check, ChevronsUpDown, Search, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { IconeDaCategoria } from './IconeDaCategoria'
import { semAcento } from './periodos'

export type GrupoDoSeletor = { nome: string; categorias: string[] }

type Props = {
  rotulo: string
  valor: string
  grupoDoValor?: string
  /** As categorias sem grupo vêm primeiro, como "Suas categorias". */
  soltas: string[]
  grupos: GrupoDoSeletor[]
  aoEscolher: (categoria: string) => void
}

const SUAS = 'Suas categorias'

/** Lista com busca e grupos. Neutra: a cor das categorias fica só na aba Categorias. */
export function SeletorDeCategoria({ rotulo, valor, grupoDoValor, soltas, grupos, aoEscolher }: Props) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const caixa = useRef<HTMLDivElement>(null)
  const idDaLista = useId()

  useEffect(() => {
    if (!aberto) return
    const fora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  }, [aberto])

  const termo = semAcento(busca.trim())
  const todos = [...(soltas.length > 0 ? [{ nome: SUAS, categorias: soltas }] : []), ...grupos]
    .map((g) => ({ ...g, categorias: g.categorias.filter((c) => semAcento(c).includes(termo)) }))
    .filter((g) => g.categorias.length > 0)

  const escolher = (categoria: string) => {
    setAberto(false)
    setBusca('')
    if (categoria !== valor) aoEscolher(categoria)
  }

  // O Esc fecha só a lista, não o diálogo em volta.
  const teclado = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && aberto) {
      e.preventDefault()
      e.stopPropagation()
      setAberto(false)
    }
  }

  return (
    <div ref={caixa} onKeyDown={teclado} className="relative inline-block max-w-full text-left">
      <button
        type="button"
        aria-label={rotulo}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? idDaLista : undefined}
        onClick={() => setAberto(!aberto)}
        className="flex h-10 max-w-full items-center gap-2 rounded-xl border border-borda bg-fundo px-3 text-sm font-medium transition-colors outline-none hover:border-primaria/40 focus-visible:border-primaria focus-visible:ring-2 focus-visible:ring-primaria/30"
      >
        <IconeDaCategoria categoria={valor} grupo={grupoDoValor} className="size-4 shrink-0 opacity-70" />
        <span className="truncate">{valor}</span>
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 opacity-60" />
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full right-0 z-10 mt-2 flex w-72 origin-top-right flex-col overflow-hidden rounded-xl border border-borda bg-superficie"
          >
            <label className="relative border-b border-borda">
              <span className="sr-only">Buscar categoria</span>
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-60" />
              <input
                type="search"
                autoFocus
                placeholder="Buscar categoria…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-11 w-full bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-texto-suave"
              />
            </label>
            <div id={idDaLista} role="listbox" aria-label={rotulo} className="max-h-72 overflow-y-auto overscroll-contain p-1">
              {todos.length === 0 && <p className="px-3 py-4 text-center text-sm text-texto-suave">Nenhuma categoria encontrada.</p>}
              {todos.map((g) => (
                <div key={g.nome} role="group" aria-label={g.nome} className="flex flex-col py-1">
                  <span aria-hidden className="flex items-center gap-2 px-2 py-1 text-xs text-texto-suave">
                    {g.nome === SUAS ? <Sparkles className="size-3.5 opacity-70" /> : <IconeDaCategoria categoria={g.categorias[0]} grupo={g.nome} className="size-3.5 opacity-70" />}
                    {g.nome}
                  </span>
                  {g.categorias.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="option"
                      aria-selected={c === valor}
                      onClick={() => escolher(c)}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-fundo ${c === valor ? 'bg-fundo font-medium' : ''}`}
                    >
                      {c}
                      {c === valor && <Check aria-hidden className="size-4 shrink-0 text-primaria" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

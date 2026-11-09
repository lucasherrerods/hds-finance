import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatarPercentual } from '../../shared'

type CabecalhoProps = { sobretitulo: string; titulo: string; descricao?: string; acoes?: ReactNode }

/** Topo de cada seção: o período em cima, o nome da seção e uma frase curta. */
export function CabecalhoDaSecao({ sobretitulo, titulo, descricao, acoes }: CabecalhoProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium tracking-wider text-texto-suave uppercase">{sobretitulo}</span>
        <h1 className="text-3xl leading-tight font-bold tracking-[-0.03em] first-letter:uppercase sm:text-4xl">{titulo}</h1>
        {descricao && <p className="max-w-[60ch] text-texto-suave">{descricao}</p>}
      </div>
      {acoes}
    </header>
  )
}

type NumeroProps = {
  rotulo: string
  icone: LucideIcon
  valor: string
  cor?: string
  /** Variação em %; `subirEBom` diz se subir é boa notícia, para a cor. */
  variacao?: number | null
  subirEBom?: boolean
}

/** Um número grande com rótulo e, quando houver, a comparação com o mês anterior. */
export function CartaoDeNumero({ rotulo, icone: Icone, valor, cor = 'text-texto', variacao = null, subirEBom = true }: NumeroProps) {
  const bom = variacao !== null && (variacao > 0) === subirEBom
  const Seta = (variacao ?? 0) > 0 ? TrendingUp : TrendingDown

  return (
    <div role="group" aria-label={rotulo} className="flex min-w-0 flex-col gap-3 rounded-2xl bg-superficie p-5 shadow-elevacao">
      <span className="flex items-center gap-2 text-sm text-texto-suave">
        <Icone aria-hidden className="size-4 opacity-70" />
        {rotulo}
      </span>
      <span className={`truncate text-2xl font-semibold tracking-tight tabular-nums ${cor}`}>{valor}</span>
      {variacao !== null && Math.round(variacao) !== 0 && (
        <span className={`flex items-center gap-1 text-sm ${bom ? 'text-entrada' : 'text-saida'}`}>
          <Seta aria-hidden className="size-4" />
          {formatarPercentual(variacao)} <span className="text-texto-suave">vs. mês anterior</span>
        </span>
      )}
    </div>
  )
}

/** Quando a seção não tem o que mostrar com este extrato. */
export function SemDados({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-superficie p-8 text-texto-suave shadow-elevacao">{children}</p>
}

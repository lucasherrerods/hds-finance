import { TrendingDown, TrendingUp } from 'lucide-react'
import { motion } from 'motion/react'
import { formatarMoeda, formatarPercentual } from '../../shared'
import type { CategoriaComparada } from '../import'
import { Cartao } from './Cartao'
import { IconeDaCategoria } from './IconeDaCategoria'

type Props = { categorias: CategoriaComparada[] }

export function PrincipaisCategorias({ categorias }: Props) {
  const maior = Math.max(1, ...categorias.map((c) => c.atual))

  return (
    <Cartao titulo="Principais categorias" className="h-full">
      {categorias.length === 0 ? (
        <p className="text-texto-suave">Nenhum gasto no mês.</p>
      ) : (
        <table aria-label="Principais categorias" className="w-full border-separate border-spacing-y-3 text-left">
          <thead className="sr-only">
            <tr>
              <th scope="col">Categoria</th>
              <th scope="col">Atual, variação e mês anterior</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c, indice) => (
              <tr key={c.categoria}>
                {/* O nome nunca é cortado: se faltar espaço, ele quebra a linha. */}
                <td className="w-full">
                  <span className="flex flex-col gap-2">
                    <span className="flex items-center gap-2">
                      <IconeDaCategoria categoria={c.categoria} grupo={c.grupo} className="size-4 shrink-0 opacity-70" />
                      {c.categoria}
                    </span>
                    <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-fundo">
                      <motion.span
                        className={`block h-full rounded-full ${(c.variacaoPercentual ?? 0) > 0 ? 'bg-saida' : 'bg-entrada'}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(c.atual / maior) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: indice * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </span>
                  </span>
                </td>
                <td className="pl-4 text-right whitespace-nowrap tabular-nums">
                  <span className="block font-semibold">{formatarMoeda(c.atual)}</span>
                  {/* No celular, as duas colunas só cabem sem o valor anterior. */}
                  <span className="flex items-center justify-end gap-2">
                    {c.anterior !== null && <span className="hidden text-sm text-texto-suave sm:inline">antes {formatarMoeda(c.anterior)}</span>}
                    <Variacao valor={c.variacaoPercentual} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Cartao>
  )
}

function Variacao({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-texto-suave">—</span>
  const subiu = valor > 0
  const Icone = subiu ? TrendingUp : TrendingDown
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap tabular-nums ${
        subiu ? 'bg-calor-1 text-saida' : 'bg-fundo text-entrada'
      }`}
    >
      <Icone aria-label={subiu ? 'subiu' : 'caiu'} role="img" className="size-4" />
      {formatarPercentual(valor)}
    </span>
  )
}

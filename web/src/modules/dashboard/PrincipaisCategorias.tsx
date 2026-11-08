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
          <thead className="text-sm text-texto-suave">
            <tr>
              <th scope="col" className="font-normal">
                Categoria
              </th>
              <th scope="col" className="text-right font-normal">
                Atual
              </th>
              <th scope="col" className="hidden font-normal md:table-cell">
                <span className="sr-only">Participação</span>
              </th>
              <th scope="col" className="text-right font-normal">
                Variação
              </th>
              <th scope="col" className="hidden text-right font-normal sm:table-cell">
                Anterior
              </th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c, indice) => {
              return (
                <tr key={c.categoria}>
                  <td className="max-w-0 pr-4">
                    <span className="flex items-center gap-3">
                      <IconeDaCategoria categoria={c.categoria} className="size-4 shrink-0 opacity-70" />
                      <span className="truncate">{c.categoria}</span>
                    </span>
                  </td>
                  <td className="text-right font-semibold whitespace-nowrap tabular-nums">{formatarMoeda(c.atual)}</td>
                  <td className="hidden w-1/4 px-4 md:table-cell">
                    <div aria-hidden className="h-2 overflow-hidden rounded-full bg-fundo">
                      <motion.div
                        className={`h-full rounded-full ${(c.variacaoPercentual ?? 0) > 0 ? 'bg-saida' : 'bg-entrada'}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(c.atual / maior) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: indice * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </td>
                  <td className="pl-4 text-right">
                    <Variacao valor={c.variacaoPercentual} />
                  </td>
                  <td className="hidden pl-4 text-right whitespace-nowrap text-texto-suave tabular-nums sm:table-cell">
                    {c.anterior === null ? '—' : formatarMoeda(c.anterior)}
                  </td>
                </tr>
              )
            })}
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

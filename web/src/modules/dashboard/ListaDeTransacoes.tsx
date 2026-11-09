import { ArrowDownLeft, ArrowUpRight, Equal, Hash, Search, type LucideIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { formatarData, formatarMoeda, formatarMoedaComSinal } from '../../shared'
import type { ResumoMensal, TransacaoCategorizada } from '../import'
import { Cartao } from './Cartao'
import { IconeDaCategoria } from './IconeDaCategoria'
import { categoriasDe, filtrarTransacoes, type Filtros, type Ordem } from './periodos'

/** Só no modo pessoal: as categorias que dá para escolher e o que fazer quando a pessoa troca uma. */
export type EdicaoDeCategoria = { categorias: string[]; aoMudar: (descricao: string, categoria: string) => void }

type Props = { transacoes: TransacaoCategorizada[]; mes: ResumoMensal; edicao?: EdicaoDeCategoria }

// Aplicações, resgates e transferências entre contas próprias não são gasto, então não têm categoria para trocar.
const MOVIMENTACAO_INTERNA = 'Investimentos e transferências'

const ordens: { valor: Ordem; rotulo: string }[] = [
  { valor: 'recentes', rotulo: 'Data (mais recentes)' },
  { valor: 'antigas', rotulo: 'Data (mais antigas)' },
  { valor: 'maior', rotulo: 'Maior valor' },
  { valor: 'menor', rotulo: 'Menor valor' },
]

export function ListaDeTransacoes({ transacoes, mes, edicao }: Props) {
  const [filtros, setFiltros] = useState<Filtros>({ busca: '', categoria: '', ordem: 'recentes' })
  const visiveis = filtrarTransacoes(transacoes, filtros)
  const idDaBusca = useId()
  const idDaCategoria = useId()
  const idDaOrdem = useId()

  return (
    <Cartao titulo="Transações">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Total" icone={Hash}>
          {visiveis.length}
        </Indicador>
        <Indicador rotulo="Despesas" icone={ArrowUpRight} cor="text-saida">
          {formatarMoedaComSinal(mes.saidas, 'saida')}
        </Indicador>
        <Indicador rotulo="Receitas" icone={ArrowDownLeft} cor="text-entrada">
          {formatarMoedaComSinal(mes.entradas, 'entrada')}
        </Indicador>
        <Indicador rotulo="Resultado" icone={Equal}>
          {formatarMoeda(mes.resultado)}
        </Indicador>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <label htmlFor={idDaBusca} className="relative flex-1">
          <span className="sr-only">Buscar transações</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-60" />
          <input
            id={idDaBusca}
            type="search"
            placeholder="Buscar transações…"
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            className="w-full rounded-lg bg-fundo py-2 pr-4 pl-10 outline-none placeholder:text-texto-suave focus-visible:ring-2 focus-visible:ring-primaria"
          />
        </label>
        <Seletor id={idDaCategoria} rotulo="Categoria">
          <select
            id={idDaCategoria}
            value={filtros.categoria}
            onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
            className={estiloDoSeletor}
          >
            <option value="">Todas as categorias</option>
            {categoriasDe(transacoes).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Seletor>
        <Seletor id={idDaOrdem} rotulo="Ordenar por">
          <select
            id={idDaOrdem}
            value={filtros.ordem}
            onChange={(e) => setFiltros({ ...filtros, ordem: e.target.value as Ordem })}
            className={estiloDoSeletor}
          >
            {ordens.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </Seletor>
      </div>

      {visiveis.length === 0 ? (
        <p className="py-8 text-center text-texto-suave">Nenhuma transação encontrada.</p>
      ) : (
        <div className="-mx-6 overflow-x-auto px-6">
          <table aria-label="Transações" className="w-full text-left">
            <thead className="text-sm tracking-wider text-texto-suave uppercase">
              <tr className="border-b border-borda">
                <th scope="col" className="w-full py-3 font-normal">
                  Descrição
                </th>
                <th scope="col" className="hidden py-3 font-normal sm:table-cell">
                  Categoria
                </th>
                <th scope="col" className="hidden py-3 font-normal md:table-cell">
                  Data
                </th>
                <th scope="col" className="py-3 pl-3 text-right font-normal sm:pl-6">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((t, i) => {
                const entrada = t.valor > 0
                return (
                  <tr key={`${t.data}-${t.descricao}-${i}`} className="border-b border-borda last:border-0">
                    <td className="max-w-0 py-3 pr-4">
                      <span className="flex items-center gap-3">
                        <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-fundo sm:flex">
                          <IconeDaCategoria categoria={t.categoria} className="size-4 opacity-70" />
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="line-clamp-2 sm:line-clamp-none sm:truncate">{t.descricao}</span>
                          <span className="truncate text-sm text-texto-suave sm:hidden">
                            {t.categoria} · {formatarData(t.data)}
                          </span>
                          <span className="hidden truncate text-sm text-texto-suave sm:inline md:hidden">
                            {formatarData(t.data)}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="hidden py-3 pr-4 sm:table-cell">
                      {edicao && t.categoria !== MOVIMENTACAO_INTERNA ? (
                        <select
                          aria-label={`Categoria de ${t.descricao}`}
                          value={t.categoria}
                          onChange={(e) => edicao.aoMudar(t.descricao, e.target.value)}
                          className="rounded-md border border-borda bg-fundo px-2 py-1 text-sm text-texto-suave focus:border-primaria focus:outline-none"
                        >
                          {[...new Set([...edicao.categorias, t.categoria])].map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded-md bg-fundo px-2 py-1 text-sm whitespace-nowrap text-texto-suave">
                          {t.categoria}
                        </span>
                      )}
                    </td>
                    <td className="hidden py-3 pr-4 whitespace-nowrap text-texto-suave tabular-nums md:table-cell">
                      {formatarData(t.data)}
                    </td>
                    <td
                      className={`py-3 pl-3 text-right font-semibold sm:pl-6 whitespace-nowrap tabular-nums ${entrada ? 'text-entrada' : ''}`}
                    >
                      {formatarMoedaComSinal(t.valor, entrada ? 'entrada' : 'saida')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Cartao>
  )
}

const estiloDoSeletor =
  'w-full rounded-lg bg-fundo px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primaria md:w-auto'

function Seletor({ id, rotulo, children }: { id: string; rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="sr-only">
        {rotulo}
      </label>
      {children}
    </div>
  )
}

type IndicadorProps = { rotulo: string; icone: LucideIcon; cor?: string; children: ReactNode }

function Indicador({ rotulo, icone: Icone, cor = '', children }: IndicadorProps) {
  return (
    <div role="group" aria-label={rotulo} className="flex items-center gap-3 rounded-xl bg-fundo p-4">
      <Icone aria-hidden className={`size-5 shrink-0 opacity-70 ${cor}`} />
      <span className="flex flex-col">
        <span className="text-sm text-texto-suave">{rotulo}</span>
        <span className={`text-lg font-semibold tabular-nums ${cor}`}>{children}</span>
      </span>
    </div>
  )
}

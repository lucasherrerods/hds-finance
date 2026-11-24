import { ArrowDownLeft, ArrowUpRight, CreditCard, Equal, Eye, EyeOff, Hash, Search, Trash2, type LucideIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { formatarData, formatarMoeda, formatarMoedaComSinal } from '../../shared'
import type { ResumoMensal, TransacaoCategorizada } from '../import'
import { Cartao } from './Cartao'
import { IconeDaCategoria } from './IconeDaCategoria'
import { Seletor } from './Seletor'
import { categoriasDe, filtrarTransacoes, type Filtros, type Ordem } from './periodos'

/** Só na área admin: trocar a categoria, ocultar e apagar transações ou meses do histórico. */
export type EdicaoDoHistorico = {
  categorias: string[]
  aoMudar: (transacao: TransacaoCategorizada, categoria: string) => void
  aoOcultar: (transacao: TransacaoCategorizada, oculta: boolean) => void
  aoApagar: (transacao: TransacaoCategorizada) => void
  aoApagarMes: (mes: { ano: number; mes: number }) => void
}

type Props = { transacoes: TransacaoCategorizada[]; mes: ResumoMensal; edicao?: EdicaoDoHistorico }

// Aplicações, resgates e transferências entre contas próprias não são gasto, então não têm categoria para trocar.
const MOVIMENTACAO_INTERNA = 'Investimentos e transferências'
const ENTRADA = 'Entrada'

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
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 opacity-60" />
          <input
            id={idDaBusca}
            type="search"
            placeholder="Buscar transações…"
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            className="h-10 w-full rounded-full border border-borda bg-fundo pr-4 pl-10 outline-none placeholder:text-texto-suave focus-visible:border-primaria focus-visible:ring-2 focus-visible:ring-primaria/30"
          />
        </label>
        <Campo id={idDaCategoria} rotulo="Categoria">
          <Seletor
            id={idDaCategoria}
            value={filtros.categoria}
            onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
          >
            <option value="">Todas as categorias</option>
            {categoriasDe(transacoes).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Seletor>
        </Campo>
        <Campo id={idDaOrdem} rotulo="Ordenar por">
          <Seletor
            id={idDaOrdem}
            value={filtros.ordem}
            onChange={(e) => setFiltros({ ...filtros, ordem: e.target.value as Ordem })}
          >
            {ordens.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </Seletor>
        </Campo>
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
                {!edicao && (
                  <th scope="col" className="hidden py-3 font-normal sm:table-cell">
                    Categoria
                  </th>
                )}
                <th scope="col" className="hidden py-3 font-normal md:table-cell">
                  Data
                </th>
                <th scope="col" className="py-3 pl-3 text-right font-normal sm:pl-6">
                  Valor
                </th>
                {edicao && (
                  <th scope="col" className="py-3 pl-3 font-normal">
                    <span className="sr-only">Ações</span>
                  </th>
                )}
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
                          {t.noCartao && (
                            <span className="flex items-center gap-1 text-sm text-texto-suave">
                              <CreditCard aria-hidden className="size-3.5 opacity-70" />
                              Cartão
                            </span>
                          )}
                          {t.oculta && (
                            <span className="flex items-center gap-1 text-sm text-texto-suave">
                              <EyeOff aria-hidden className="size-3.5 opacity-70" />
                              Fora da soma
                            </span>
                          )}
                          {edicao && <Categoria transacao={t} edicao={edicao} />}
                          <span className="truncate text-sm text-texto-suave sm:hidden">
                            {edicao ? formatarData(t.data) : `${t.categoria} · ${formatarData(t.data)}`}
                          </span>
                          <span className="hidden truncate text-sm text-texto-suave sm:inline md:hidden">
                            {formatarData(t.data)}
                          </span>
                        </span>
                      </span>
                    </td>
                    {!edicao && (
                      <td className="hidden py-3 pr-4 sm:table-cell">
                        <span className="rounded-md bg-fundo px-2 py-1 text-sm whitespace-nowrap text-texto-suave">{t.categoria}</span>
                      </td>
                    )}
                    <td className="hidden py-3 pr-4 whitespace-nowrap text-texto-suave tabular-nums md:table-cell">
                      {formatarData(t.data)}
                    </td>
                    <td
                      className={`py-3 pl-3 text-right font-semibold sm:pl-6 whitespace-nowrap tabular-nums ${
                        t.oculta ? 'text-texto-suave line-through' : entrada ? 'text-entrada' : ''
                      }`}
                    >
                      {formatarMoedaComSinal(t.valor, entrada ? 'entrada' : 'saida')}
                    </td>
                    {edicao && (
                      <td className="py-3 pl-3">
                        <span className="flex flex-col sm:flex-row">
                          <button
                            type="button"
                            aria-label={`${t.oculta ? 'Mostrar' : 'Ocultar'} ${t.descricao}`}
                            title={t.oculta ? 'Voltar a somar' : 'Tirar das somas'}
                            onClick={() => edicao.aoOcultar(t, !t.oculta)}
                            className="grid size-8 place-items-center rounded-full text-texto-suave transition-colors hover:bg-fundo hover:text-texto"
                          >
                            {t.oculta ? <Eye aria-hidden className="size-4" /> : <EyeOff aria-hidden className="size-4" />}
                          </button>
                          <button
                            type="button"
                            aria-label={`Apagar ${t.descricao}`}
                            onClick={() => edicao.aoApagar(t)}
                            className="grid size-8 place-items-center rounded-full text-texto-suave transition-colors hover:bg-fundo hover:text-saida"
                          >
                            <Trash2 aria-hidden className="size-4" />
                          </button>
                        </span>
                      </td>
                    )}
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

function Categoria({ transacao: t, edicao }: { transacao: TransacaoCategorizada; edicao: EdicaoDoHistorico }) {
  if (t.categoria === MOVIMENTACAO_INTERNA) return <span className="text-sm text-texto-suave">{t.categoria}</span>
  const ehEntrada = t.valor > 0 && !t.noCartao
  const opcoes = new Set([...(ehEntrada ? [ENTRADA] : []), ...edicao.categorias, t.categoria])
  return (
    <Seletor
      compacto
      icone={<IconeDaCategoria categoria={t.categoria} className="size-3.5" />}
      aria-label={`Categoria de ${t.descricao}`}
      value={t.categoria}
      onChange={(e) => edicao.aoMudar(t, e.target.value)}
      className="mt-1 self-start"
    >
      {[...opcoes].map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </Seletor>
  )
}

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: ReactNode }) {
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

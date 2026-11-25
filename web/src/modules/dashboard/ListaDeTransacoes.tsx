import { ArrowDownLeft, ArrowUpRight, CreditCard, Equal, Eye, EyeOff, Hash, Search, Trash2, type LucideIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { formatarData, formatarMoeda, formatarMoedaComSinal, IconeDoBanco } from '../../shared'
import type { ResumoMensal, TransacaoCategorizada } from '../import'
import { IconeDaCategoria } from './IconeDaCategoria'
import { tomDaCategoria } from './iconesDeCategoria'
import { Seletor } from './Seletor'
import { bancosDe, categoriasDe, filtrarTransacoes, type Filtros, type Ordem, type TipoDeFiltro } from './periodos'

/** Trocar a categoria e ocultar. Apagar só existe na área admin, onde há histórico guardado. */
export type EdicaoDoHistorico = {
  categorias: string[]
  aoMudar: (transacao: TransacaoCategorizada, categoria: string) => void
  aoOcultar: (transacao: TransacaoCategorizada, oculta: boolean) => void
  aoApagar?: (transacao: TransacaoCategorizada) => void
  aoApagarMes?: (mes: { ano: number; mes: number }) => void
}

type Props = { transacoes: TransacaoCategorizada[]; mes: ResumoMensal; edicao?: EdicaoDoHistorico }

// Aplicações, resgates e transferências entre contas próprias não são gasto, então não têm categoria para trocar.
const MOVIMENTACAO_INTERNA = 'Investimentos e transferências'
const ENTRADA = 'Entrada'
const EMPRESTIMOS = 'Empréstimos'

const ordens: { valor: Ordem; rotulo: string }[] = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'antigas', rotulo: 'Mais antigas' },
  { valor: 'maior', rotulo: 'Maior valor' },
  { valor: 'menor', rotulo: 'Menor valor' },
]

const tipos: { valor: TipoDeFiltro; rotulo: string }[] = [
  { valor: '', rotulo: 'Entradas e saídas' },
  { valor: 'entradas', rotulo: 'Só entradas' },
  { valor: 'saidas', rotulo: 'Só saídas' },
  { valor: 'cartao', rotulo: 'Só no cartão' },
]

// No celular cada linha vira um bloco de duas linhas; os papéis de tabela são escritos porque o grid os apaga.
const linha = 'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-1 border-b border-borda py-3 last:border-0 md:table-row md:py-0'
const celula = 'md:border-b md:border-borda md:py-3 md:pr-4 md:group-last:border-0'

export function ListaDeTransacoes({ transacoes, mes, edicao }: Props) {
  const [filtros, setFiltros] = useState<Filtros>({ busca: '', categoria: '', ordem: 'recentes', banco: '', tipo: '', comOcultas: false })
  const mudar = (parte: Partial<Filtros>) => setFiltros({ ...filtros, ...parte })
  const bancos = bancosDe(transacoes)
  const ocultas = transacoes.filter((t) => t.oculta).length
  const temCartao = transacoes.some((t) => t.noCartao)
  const visiveis = filtrarTransacoes(transacoes, filtros)
  const idDaBusca = useId()

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-wrap lg:items-center">
        {bancos.length > 1 && (
          <Filtro rotulo="Banco" valor={filtros.banco ?? ''} aoMudar={(banco) => mudar({ banco })}>
            <option value="">Contas</option>
            {bancos.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Filtro>
        )}
        <Filtro rotulo="Tipo" valor={filtros.tipo ?? ''} aoMudar={(tipo) => mudar({ tipo: tipo as TipoDeFiltro })}>
          {tipos
            .filter((t) => t.valor !== 'cartao' || temCartao)
            .map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
        </Filtro>
        <Filtro rotulo="Ordenar por" valor={filtros.ordem} aoMudar={(ordem) => mudar({ ordem: ordem as Ordem })}>
          {ordens.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </Filtro>
        <Filtro rotulo="Categoria" valor={filtros.categoria} aoMudar={(categoria) => mudar({ categoria })}>
          <option value="">Categorias</option>
          {categoriasDe(transacoes).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Filtro>
        {ocultas > 0 && (
          <button
            type="button"
            role="switch"
            aria-checked={filtros.comOcultas}
            onClick={() => mudar({ comOcultas: !filtros.comOcultas })}
            className="col-span-2 flex h-10 items-center gap-2 rounded-full px-2 text-texto-suave transition-colors hover:text-texto"
          >
            <span aria-hidden className={`flex h-6 w-10 items-center rounded-full p-1 transition-colors ${filtros.comOcultas ? 'bg-primaria' : 'bg-borda'}`}>
              <span className={`size-4 rounded-full bg-superficie transition-transform ${filtros.comOcultas ? 'translate-x-4' : ''}`} />
            </span>
            Mostrar ocultas ({ocultas})
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Total" icone={Hash}>
          {visiveis.length}
        </Indicador>
        <Indicador rotulo="Despesas do mês" icone={ArrowUpRight} cor="text-saida">
          {formatarMoedaComSinal(mes.saidas, 'saida')}
        </Indicador>
        <Indicador rotulo="Receitas do mês" icone={ArrowDownLeft} cor="text-entrada">
          {formatarMoedaComSinal(mes.entradas, 'entrada')}
        </Indicador>
        <Indicador rotulo="Resultado do mês" icone={Equal}>
          {formatarMoeda(mes.resultado)}
        </Indicador>
      </div>

      <section aria-label="Lista de transações" className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-4 sm:p-6">
        <label htmlFor={idDaBusca} className="relative w-full sm:max-w-80">
          <span className="sr-only">Buscar transações</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 opacity-60" />
          <input
            id={idDaBusca}
            type="search"
            placeholder="Buscar transações…"
            value={filtros.busca}
            onChange={(e) => mudar({ busca: e.target.value })}
            className="h-10 w-full rounded-full border border-borda bg-fundo pr-4 pl-10 outline-none placeholder:text-texto-suave focus-visible:border-primaria focus-visible:ring-2 focus-visible:ring-primaria/30"
          />
        </label>

        {visiveis.length === 0 ? (
          <p className="py-8 text-center text-texto-suave">Nenhuma transação encontrada.</p>
        ) : (
          <table role="table" aria-label="Transações" className="block w-full text-left md:table md:border-separate md:border-spacing-0">
            <thead role="rowgroup" className="hidden text-sm tracking-wider text-texto-suave uppercase md:table-header-group">
              <tr role="row">
                <Coluna className="w-full">Descrição</Coluna>
                <Coluna>Categoria</Coluna>
                <Coluna className="hidden lg:table-cell">Conta</Coluna>
                <Coluna>Data</Coluna>
                <Coluna className="text-right">Valor</Coluna>
                {edicao && (
                  <Coluna>
                    <span className="sr-only">Ações</span>
                  </Coluna>
                )}
              </tr>
            </thead>
            <tbody role="rowgroup" className="block md:table-row-group">
              {visiveis.map((t, i) => (
                <Linha key={t.chave ?? `${t.data}-${t.descricao}-${i}`} transacao={t} edicao={edicao} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}

function Coluna({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th scope="col" role="columnheader" className={`border-b border-borda py-3 pr-4 font-normal ${className}`}>
      {children}
    </th>
  )
}

function Linha({ transacao: t, edicao }: { transacao: TransacaoCategorizada; edicao?: EdicaoDoHistorico }) {
  const entrada = t.valor > 0
  const banco = t.banco ?? 'Inter'
  return (
    <tr role="row" className={`group ${linha}`}>
      <td role="cell" className={`min-w-0 md:max-w-0 ${celula}`}>
        <span className="flex items-center gap-3">
          <span className={`hidden size-9 shrink-0 place-items-center rounded-lg sm:grid ${tomDaCategoria(t.categoria)}`}>
            <IconeDaCategoria categoria={t.categoria} className="size-4 opacity-70" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="line-clamp-2 md:line-clamp-none md:truncate" title={t.descricao}>
              {t.descricao}
            </span>
            {t.oculta && (
              <span className="flex items-center gap-1 text-sm text-texto-suave">
                <EyeOff aria-hidden className="size-3.5 opacity-70" />
                Fora da soma
              </span>
            )}
          </span>
        </span>
      </td>
      <td role="cell" className={`order-3 min-w-0 ${celula}`}>
        {edicao ? <Categoria transacao={t} edicao={edicao} /> : <Etiqueta categoria={t.categoria} />}
      </td>
      <td role="cell" className={`order-5 hidden whitespace-nowrap text-texto-suave lg:table-cell ${celula}`}>
        <span className="flex items-center gap-2">
          <IconeDoBanco banco={banco} pequeno />
          {banco}
          {t.noCartao && (
            <span className="flex items-center gap-1 text-sm">
              <CreditCard aria-hidden className="size-3.5 opacity-70" />
              Cartão
            </span>
          )}
        </span>
      </td>
      <td role="cell" className={`order-4 ${edicao ? '' : 'col-span-2'} text-right text-sm whitespace-nowrap text-texto-suave tabular-nums md:text-left md:text-base ${celula}`}>
        {formatarData(t.data)}
      </td>
      <td
        role="cell"
        className={`order-2 col-span-2 text-right font-semibold whitespace-nowrap tabular-nums ${celula} ${t.oculta ? 'text-texto-suave line-through' : entrada ? 'text-entrada' : ''}`}
      >
        {formatarMoedaComSinal(t.valor, entrada ? 'entrada' : 'saida')}
      </td>
      {edicao && (
        <td role="cell" className={`order-6 justify-self-end ${celula} md:pr-0`}>
          <span className="flex">
            <button
              type="button"
              aria-label={`${t.oculta ? 'Mostrar' : 'Ocultar'} ${t.descricao}`}
              title={t.oculta ? 'Voltar a somar' : 'Tirar das somas'}
              onClick={() => edicao.aoOcultar(t, !t.oculta)}
              className="grid size-8 place-items-center rounded-full text-texto-suave transition-colors hover:bg-fundo hover:text-texto"
            >
              {t.oculta ? <Eye aria-hidden className="size-4" /> : <EyeOff aria-hidden className="size-4" />}
            </button>
            {edicao.aoApagar && (
              <button
                type="button"
                aria-label={`Apagar ${t.descricao}`}
                title="Apagar"
                onClick={() => edicao.aoApagar?.(t)}
                className="grid size-8 place-items-center rounded-full text-texto-suave transition-colors hover:bg-fundo hover:text-saida"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            )}
          </span>
        </td>
      )}
    </tr>
  )
}

function Etiqueta({ categoria }: { categoria: string }) {
  return <span className={`inline-block max-w-full truncate rounded-full px-2 py-1 align-middle text-sm whitespace-nowrap ${tomDaCategoria(categoria)}`}>{categoria}</span>
}

function Categoria({ transacao: t, edicao }: { transacao: TransacaoCategorizada; edicao: EdicaoDoHistorico }) {
  if (t.categoria === MOVIMENTACAO_INTERNA) return <Etiqueta categoria={t.categoria} />
  const ehEntrada = t.valor > 0 && !t.noCartao
  // Numa entrada, as duas que mudam a conta vêm primeiro: receita ou dinheiro emprestado.
  const opcoes = new Set([...(ehEntrada ? [ENTRADA, EMPRESTIMOS] : []), ...edicao.categorias, t.categoria])
  return (
    <Seletor
      compacto
      fundo={tomDaCategoria(t.categoria)}
      aria-label={`Categoria de ${t.descricao}`}
      value={t.categoria}
      onChange={(e) => edicao.aoMudar(t, e.target.value)}
    >
      {[...opcoes].map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </Seletor>
  )
}

type FiltroProps = { rotulo: string; valor: string; aoMudar: (valor: string) => void; children: ReactNode }

function Filtro({ rotulo, valor, aoMudar, children }: FiltroProps) {
  return (
    <Seletor aria-label={rotulo} value={valor} onChange={(e) => aoMudar(e.target.value)}>
      {children}
    </Seletor>
  )
}

type IndicadorProps = { rotulo: string; icone: LucideIcon; cor?: string; children: ReactNode }

function Indicador({ rotulo, icone: Icone, cor = '', children }: IndicadorProps) {
  return (
    <div role="group" aria-label={rotulo} className="flex items-center gap-3 rounded-2xl border border-borda bg-superficie p-4">
      <Icone aria-hidden className={`hidden size-5 shrink-0 sm:block opacity-70 ${cor}`} />
      <span className="flex flex-col">
        <span className="text-sm text-texto-suave">{rotulo}</span>
        <span className={`font-semibold tabular-nums sm:text-lg ${cor}`}>{children}</span>
      </span>
    </div>
  )
}

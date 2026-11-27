import { ArrowDownLeft, ArrowUpRight, CreditCard, Equal, Eye, EyeOff, Hash, Search, Trash2, X, type LucideIcon } from 'lucide-react'
import { useId, useState, type MouseEvent, type ReactNode } from 'react'
import { formatarData, formatarMoeda, formatarMoedaComSinal, IconeDoBanco } from '../../shared'
import type { GrupoDeCategoria, TransacaoCategorizada } from '../import'
import type { Totais } from './intervalo'
import { IconeDaCategoria } from './IconeDaCategoria'
import { tomDaCategoria } from './iconesDeCategoria'
import { Seletor } from './Seletor'
import { Etiqueta } from './CategoriaDaTransacao'
import { DetalheDaTransacao } from './DetalheDaTransacao'
import { bancosDe, categoriasDe, filtrarTransacoes, type Filtros, type Ordem, type TipoDeFiltro } from './periodos'

/** Trocar a categoria e ocultar. Apagar só existe na área admin, onde há histórico guardado. */
export type EdicaoDoHistorico = {
  categorias: string[]
  /** Com os grupos, a lista de categorias vem separada por grupo. */
  grupos?: GrupoDeCategoria[]
  aoMudar: (transacao: TransacaoCategorizada, categoria: string) => void
  aoOcultar: (transacao: TransacaoCategorizada, oculta: boolean) => void
  aoApagar?: (transacao: TransacaoCategorizada) => void
  aoApagarMes?: (mes: { ano: number; mes: number }) => void
}

type Props = {
  transacoes: TransacaoCategorizada[]
  /** Vindo de outra aba, como Categorias: a lista já abre filtrada. */
  filtroInicial?: Partial<Filtros>
  /** Os números do período, que vêm do fechamento da api quando o período é de meses inteiros. */
  totais: Totais
  /** "do mês" ou "no período". */
  sufixo?: string
  /** O seletor de período, que entra na mesma linha dos filtros. */
  periodo?: ReactNode
  edicao?: EdicaoDoHistorico
  /** Onde procurar as transações semelhantes nos detalhes; sem ele, só no período. */
  historico?: TransacaoCategorizada[]
}

const ordens: { valor: Ordem; rotulo: string }[] = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'antigas', rotulo: 'Mais antigas' },
  { valor: 'maior', rotulo: 'Maior valor' },
  { valor: 'menor', rotulo: 'Menor valor' },
]

const tipos: { valor: TipoDeFiltro; rotulo: string }[] = [
  { valor: '', rotulo: 'Todas as transações' },
  { valor: 'entradas', rotulo: 'Só entradas' },
  { valor: 'saidas', rotulo: 'Só saídas' },
  { valor: 'cartao', rotulo: 'Só no cartão' },
]

// No celular cada linha vira um bloco de duas linhas; os papéis de tabela são escritos porque o grid os apaga.
const linha = 'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-1 border-b border-borda py-3 last:border-0 md:table-row md:py-0'
const celula = 'md:border-b md:border-borda md:py-3 md:pr-4 md:group-last:border-0'

export function ListaDeTransacoes({ transacoes, totais, sufixo = 'do mês', periodo, edicao, filtroInicial, historico = transacoes }: Props) {
  const [aberta, setAberta] = useState<TransacaoCategorizada | null>(null)
  const [filtros, setFiltros] = useState<Filtros>({ busca: '', categoria: '', ordem: 'recentes', banco: '', tipo: '', comOcultas: false, ...filtroInicial })
  const mudar = (parte: Partial<Filtros>) => setFiltros({ ...filtros, ...parte })
  const bancos = bancosDe(transacoes)
  const ocultas = transacoes.filter((t) => t.oculta).length
  const temCartao = transacoes.some((t) => t.noCartao)
  const visiveis = filtrarTransacoes(transacoes, filtros)
  const idDaBusca = useId()

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-wrap lg:items-center">
        {periodo}
        {bancos.length > 1 && (
          <Filtro rotulo="Banco" valor={filtros.banco ?? ''} aoMudar={(banco) => mudar({ banco })}>
            <option value="">Todas as contas</option>
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
          <option value="">Todas as categorias</option>
          {categoriasDe(transacoes).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Filtro>
        {filtros.grupo && (
          <button
            type="button"
            onClick={() => mudar({ grupo: '' })}
            aria-label={`Tirar o filtro do grupo ${filtros.grupo}`}
            className="flex h-10 items-center gap-2 rounded-full border border-borda bg-superficie px-4 text-sm hover:border-primaria"
          >
            Grupo: {filtros.grupo}
            <X aria-hidden className="size-4 opacity-70" />
          </button>
        )}
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
        <Indicador rotulo={`Receitas ${sufixo}`} icone={ArrowDownLeft} cor="text-entrada">
          {formatarMoedaComSinal(totais.entradas, 'entrada')}
        </Indicador>
        <Indicador rotulo={`Despesas ${sufixo}`} icone={ArrowUpRight} cor="text-saida">
          {formatarMoedaComSinal(totais.saidas, 'saida')}
        </Indicador>
        {/* A cor segue o que venceu: sobrou é verde como as receitas, faltou é vermelho como as despesas. */}
        <Indicador rotulo={`Resultado ${sufixo}`} icone={Equal} cor={totais.resultado > 0 ? 'text-entrada' : totais.resultado < 0 ? 'text-saida' : ''}>
          {formatarMoeda(totais.resultado)}
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
                <Linha key={t.chave ?? `${t.data}-${t.descricao}-${i}`} transacao={t} edicao={edicao} aoAbrir={() => setAberta(t)} />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {aberta && <DetalheDaTransacao transacao={aberta} historico={historico} edicao={edicao} aoEscolher={setAberta} aoFechar={() => setAberta(null)} />}
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

type LinhaProps = { transacao: TransacaoCategorizada; edicao?: EdicaoDoHistorico; aoAbrir: () => void }

function Linha({ transacao: t, edicao, aoAbrir }: LinhaProps) {
  const entrada = t.valor > 0
  const banco = t.banco ?? 'Inter'
  // A linha toda abre os detalhes, menos os controles que já têm ação própria.
  const abrir = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('button, select, a')) aoAbrir()
  }
  return (
    <tr role="row" onClick={abrir} className={`group cursor-pointer transition-colors md:hover:bg-fundo/60 ${linha}`}>
      <td role="cell" className={`min-w-0 md:max-w-0 ${celula}`}>
        <span className="flex items-center gap-3">
          <span className={`hidden size-9 shrink-0 place-items-center rounded-lg sm:grid ${tomDaCategoria(t.categoria, t.grupo)}`}>
            <IconeDaCategoria categoria={t.categoria} grupo={t.grupo} className="size-4 opacity-70" />
          </span>
          <span className="flex min-w-0 flex-col">
            <button
              type="button"
              onClick={aoAbrir}
              aria-label={`Detalhes de ${t.descricao}`}
              title={t.descricao}
              className="line-clamp-2 text-left outline-none focus-visible:underline md:line-clamp-none md:truncate"
            >
              {t.descricao}
            </button>
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
        <Etiqueta categoria={t.categoria} grupo={t.grupo} />
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

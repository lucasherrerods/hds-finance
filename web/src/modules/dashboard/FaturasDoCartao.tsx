import { ChevronDown, CircleCheck, CircleHelp } from 'lucide-react'
import { useId, useState } from 'react'
import { formatarData, formatarMes, formatarMoeda, formatarMoedaComSinal } from '../../shared'
import type { TransacaoCategorizada } from '../import'
import { Abas } from './Abas'
import { IconeDaCategoria } from './IconeDaCategoria'

export type Fatura = {
  vencimento: string
  total: number | null
  gasto: number
  /** Nulo quando não dá para saber. */
  paga: boolean | null
  compras: TransacaoCategorizada[]
}

const anoDa = (f: Fatura) => f.vencimento.slice(0, 4)

/** As faturas incluídas, da mais nova para a mais antiga, com as compras de cada uma. */
export function FaturasDoCartao({ faturas }: { faturas: Fatura[] }) {
  const anos = [...new Set(faturas.map(anoDa))]
  const [escolhido, setEscolhido] = useState(anos[0])
  const idDoPainel = useId()
  const ano = anos.includes(escolhido) ? escolhido : anos[0]
  const comAbas = anos.length > 1

  return (
    <div className="flex flex-col gap-6">
      {comAbas && (
        <Abas
          rotulo="Anos das faturas"
          abas={anos.map((a) => ({ chave: a, rotulo: a }))}
          selecionada={ano}
          aoSelecionar={setEscolhido}
          idDoPainel={idDoPainel}
        />
      )}
      <div id={idDoPainel} role={comAbas ? 'tabpanel' : undefined} className="flex flex-col gap-4">
        {faturas
          .filter((f) => anoDa(f) === ano)
          .map((f, i) => (
            <CartaoDaFatura key={f.vencimento} fatura={f} abertaNoInicio={i === 0} />
          ))}
      </div>
    </div>
  )
}

function CartaoDaFatura({ fatura, abertaNoInicio }: { fatura: Fatura; abertaNoInicio: boolean }) {
  const [aberta, setAberta] = useState(abertaNoInicio)
  const id = useId()
  const [ano, mes] = fatura.vencimento.split('-').map(Number)

  return (
    <section className="rounded-2xl border border-borda bg-superficie">
      <button
        type="button"
        aria-expanded={aberta}
        aria-controls={id}
        onClick={() => setAberta(!aberta)}
        className="flex w-full items-center justify-between gap-4 rounded-2xl p-6 text-left"
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-lg font-semibold tracking-tight first-letter:uppercase">{formatarMes(ano, mes)}</span>
          <span className="text-sm text-texto-suave">Vence em {formatarData(fatura.vencimento)}</span>
          {fatura.paga !== null && <Situacao paga={fatura.paga} />}
        </span>
        <span className="flex shrink-0 items-center gap-4">
          <span className="flex flex-col items-end">
            <span className="text-xl font-semibold tabular-nums">{formatarMoeda(fatura.total ?? fatura.gasto)}</span>
            <span className="text-sm text-texto-suave">{fatura.compras.length} lançamentos</span>
          </span>
          <ChevronDown aria-hidden className={`size-5 text-texto-suave transition-transform ${aberta ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {aberta && (
        <ul id={id} className="flex flex-col px-6 pb-4">
          {fatura.compras.map((c, i) => (
            <li key={c.chave ?? i} className="flex items-center justify-between gap-4 border-t border-borda py-3">
              <span className="flex min-w-0 items-center gap-3">
                <IconeDaCategoria categoria={c.categoria} className="size-4 shrink-0 opacity-70" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{c.descricao}</span>
                  <span className="text-sm text-texto-suave">
                    {formatarData(c.data)} · {c.categoria}
                    {c.oculta && ' · Fora da soma'}
                  </span>
                </span>
              </span>
              <span className={`shrink-0 font-semibold tabular-nums ${c.oculta ? 'text-texto-suave line-through' : c.valor > 0 ? 'text-entrada' : ''}`}>
                {formatarMoedaComSinal(c.valor, c.valor > 0 ? 'entrada' : 'saida')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Situacao({ paga }: { paga: boolean }) {
  const Icone = paga ? CircleCheck : CircleHelp
  return (
    <span className={`flex items-center gap-1 text-sm ${paga ? 'text-entrada' : 'text-texto-suave'}`}>
      <Icone aria-hidden className="size-4 opacity-80" />
      {paga ? 'Paga' : 'Pagamento não encontrado'}
    </span>
  )
}

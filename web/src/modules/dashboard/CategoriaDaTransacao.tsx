import type { TransacaoCategorizada } from '../import'
import type { EdicaoDoHistorico } from './ListaDeTransacoes'
import { IconeDaCategoria } from './IconeDaCategoria'
import { SeletorDeCategoria } from './SeletorDeCategoria'

// Aplicações, resgates e transferências entre contas próprias não são gasto, então não têm categoria para trocar.
const MOVIMENTACAO_INTERNA = 'Investimentos e transferências'
const ENTRADA = 'Entrada'
const EMPRESTIMOS = 'Empréstimos'

/** Na lista é só a etiqueta; o seletor fica nos detalhes da transação. */
export function CategoriaDaTransacao({ transacao, edicao, aoMudar }: { transacao: TransacaoCategorizada; edicao?: EdicaoDoHistorico; aoMudar?: (categoria: string) => void }) {
  return edicao ? <Categoria transacao={transacao} edicao={edicao} aoMudar={aoMudar} /> : <Etiqueta categoria={transacao.categoria} grupo={transacao.grupo} />
}

/** Neutra: a cor das categorias fica só na aba Categorias. */
export function Etiqueta({ categoria, grupo }: { categoria: string; grupo?: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-borda px-2 py-1 align-middle text-sm whitespace-nowrap">
      <IconeDaCategoria categoria={categoria} grupo={grupo} className="size-3.5 shrink-0 opacity-70" />
      <span className="truncate">{categoria}</span>
    </span>
  )
}

function Categoria({ transacao: t, edicao, aoMudar }: { transacao: TransacaoCategorizada; edicao: EdicaoDoHistorico; aoMudar?: (categoria: string) => void }) {
  if (t.categoria === MOVIMENTACAO_INTERNA) return <Etiqueta categoria={t.categoria} grupo={t.grupo} />
  const ehEntrada = t.valor > 0 && !t.noCartao
  // Numa entrada, as duas que mudam a conta vêm primeiro: receita ou dinheiro emprestado.
  const opcoes = new Set([...(ehEntrada ? [ENTRADA, EMPRESTIMOS] : []), ...edicao.categorias, t.categoria])
  const grupos = (edicao.grupos ?? [])
    .map((g) => ({ nome: g.nome, categorias: g.categorias.filter((c) => opcoes.has(c)) }))
    .filter((g) => g.categorias.length > 0)
  const agrupadas = new Set(grupos.flatMap((g) => g.categorias))
  const soltas = [...opcoes].filter((c) => !agrupadas.has(c))
  return (
    <SeletorDeCategoria
      rotulo={`Categoria de ${t.descricao}`}
      valor={t.categoria}
      grupoDoValor={t.grupo}
      soltas={soltas}
      grupos={grupos}
      aoEscolher={(c) => {
        edicao.aoMudar(t, c)
        aoMudar?.(c)
      }}
    />
  )
}

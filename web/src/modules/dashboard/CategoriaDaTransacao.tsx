import type { TransacaoCategorizada } from '../import'
import type { EdicaoDoHistorico } from './ListaDeTransacoes'
import { tomDaCategoria } from './iconesDeCategoria'
import { Seletor } from './Seletor'

// Aplicações, resgates e transferências entre contas próprias não são gasto, então não têm categoria para trocar.
const MOVIMENTACAO_INTERNA = 'Investimentos e transferências'
const ENTRADA = 'Entrada'
const EMPRESTIMOS = 'Empréstimos'

/** Seletor quando há edição; etiqueta quando não há. */
export function CategoriaDaTransacao({ transacao, edicao }: { transacao: TransacaoCategorizada; edicao?: EdicaoDoHistorico }) {
  return edicao ? <Categoria transacao={transacao} edicao={edicao} /> : <Etiqueta categoria={transacao.categoria} />
}

function Etiqueta({ categoria }: { categoria: string }) {
  return <span className={`inline-block max-w-full truncate rounded-full px-2 py-1 align-middle text-sm whitespace-nowrap ${tomDaCategoria(categoria)}`}>{categoria}</span>
}

function Categoria({ transacao: t, edicao }: { transacao: TransacaoCategorizada; edicao: EdicaoDoHistorico }) {
  if (t.categoria === MOVIMENTACAO_INTERNA) return <Etiqueta categoria={t.categoria} />
  const ehEntrada = t.valor > 0 && !t.noCartao
  // Numa entrada, as duas que mudam a conta vêm primeiro: receita ou dinheiro emprestado.
  const opcoes = new Set([...(ehEntrada ? [ENTRADA, EMPRESTIMOS] : []), ...edicao.categorias, t.categoria])
  const grupos = (edicao.grupos ?? [])
    .map((g) => ({ nome: g.nome, categorias: g.categorias.filter((c) => opcoes.has(c)) }))
    .filter((g) => g.categorias.length > 0)
  const agrupadas = new Set(grupos.flatMap((g) => g.categorias))
  const soltas = [...opcoes].filter((c) => !agrupadas.has(c))
  return (
    <Seletor
      compacto
      fundo={tomDaCategoria(t.categoria, t.grupo)}
      aria-label={`Categoria de ${t.descricao}`}
      value={t.categoria}
      onChange={(e) => edicao.aoMudar(t, e.target.value)}
    >
      {soltas.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      {grupos.map((g) => (
        <optgroup key={g.nome} label={g.nome}>
          {g.categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </optgroup>
      ))}
    </Seletor>
  )
}

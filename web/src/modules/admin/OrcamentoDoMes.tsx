import { Pencil, Target } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Dialogo, formatarMoeda } from '../../shared'
import { definirOrcamento, type Orcamento } from './api'

type Props = {
  orcamento: Orcamento[]
  /** Os grupos que aceitam limite, na ordem em que aparecem. */
  grupos: string[]
  /** Depois de salvar, para o painel buscar o histórico de novo. */
  aoSalvar: (mensagem: string) => void
}

const rotuloDa: Record<Orcamento['situacao'], string> = { Tranquilo: 'No limite', Atencao: 'Atenção', Estourou: 'Estourou' }
const corDa: Record<Orcamento['situacao'], string> = { Tranquilo: 'bg-primaria', Atencao: 'bg-calor-3', Estourou: 'bg-saida' }

/** Limite por grupo no mês mais recente. A situação vem escrita, além da cor da barra. */
export function OrcamentoDoMes({ orcamento, grupos, aoSalvar }: Props) {
  const [editando, setEditando] = useState(false)

  return (
    <section aria-label="Orçamento do mês" className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-6">
      <header className="flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-sm font-medium tracking-wider text-texto-suave uppercase">
          <Target aria-hidden className="size-4 opacity-70" />
          Orçamento do mês
        </h3>
        {orcamento.length > 0 && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="flex items-center gap-2 rounded-full px-3 py-1 text-sm text-texto-suave transition-colors hover:bg-fundo hover:text-texto"
          >
            <Pencil aria-hidden className="size-3.5 opacity-70" />
            Editar limites
          </button>
        )}
      </header>

      {orcamento.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-texto-suave">Defina um limite por mês para cada grupo e acompanhe quanto já foi.</p>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded-full border border-borda px-4 py-2 text-sm font-medium transition-colors hover:border-primaria"
          >
            Definir limites
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {orcamento.map((o) => (
            <li key={o.grupo} role="group" aria-label={o.grupo} className="flex flex-col gap-2">
              <span className="flex items-baseline justify-between gap-4">
                <span className="font-medium">{o.grupo}</span>
                <span className="text-sm text-texto-suave tabular-nums">
                  {formatarMoeda(o.gasto)} de {formatarMoeda(o.limite)}
                </span>
              </span>
              <span aria-hidden className="h-2 overflow-hidden rounded-full bg-fundo">
                <motion.span
                  className={`block h-full rounded-full ${corDa[o.situacao]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(o.percentual, 100)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </span>
              <span className={`text-sm tabular-nums ${o.situacao === 'Estourou' ? 'text-saida' : 'text-texto-suave'}`}>
                {o.percentual.toLocaleString('pt-BR')}% · {rotuloDa[o.situacao]}
              </span>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <EditarLimites
          orcamento={orcamento}
          grupos={grupos}
          aoFechar={() => setEditando(false)}
          aoSalvar={(mensagem) => {
            setEditando(false)
            aoSalvar(mensagem)
          }}
        />
      )}
    </section>
  )
}

type EdicaoProps = { orcamento: Orcamento[]; grupos: string[]; aoFechar: () => void; aoSalvar: (mensagem: string) => void }

function EditarLimites({ orcamento, grupos, aoFechar, aoSalvar }: EdicaoProps) {
  const atuais = Object.fromEntries(orcamento.map((o) => [o.grupo, String(o.limite)]))
  const [valores, setValores] = useState<Record<string, string>>(atuais)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    setSalvando(true)
    setErro(null)
    const mudados = grupos.filter((g) => (valores[g] ?? '') !== (atuais[g] ?? ''))
    for (const grupo of mudados) {
      const texto = (valores[grupo] ?? '').replace(',', '.').trim()
      const resultado = await definirOrcamento(grupo, texto === '' ? null : Number(texto))
      if (!resultado.ok) {
        setSalvando(false)
        return setErro(resultado.mensagem)
      }
    }
    aoSalvar(mudados.length > 0 ? 'Limites salvos.' : 'Nada mudou nos limites.')
  }

  return (
    <Dialogo
      rotulo="Limites por grupo"
      aoFechar={aoFechar}
      className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg rounded-2xl border"
      cabecalho={<h2 className="text-lg font-semibold tracking-tight">Limites por grupo</h2>}
    >
      <p className="text-texto-suave">Quanto gastar por mês em cada grupo. Deixe em branco para não acompanhar.</p>
      <ul className="flex flex-col gap-3">
        {grupos.map((g) => (
          <li key={g} className="flex items-center justify-between gap-4">
            <label htmlFor={`limite-${g}`}>{g}</label>
            <span className="relative">
              <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-texto-suave">
                R$
              </span>
              <input
                id={`limite-${g}`}
                aria-label={`Limite de ${g}`}
                inputMode="decimal"
                value={valores[g] ?? ''}
                onChange={(e) => setValores({ ...valores, [g]: e.target.value })}
                className="h-10 w-36 rounded-xl border border-borda bg-fundo pr-3 pl-9 text-right tabular-nums outline-none focus-visible:border-primaria focus-visible:ring-2 focus-visible:ring-primaria/30"
              />
            </span>
          </li>
        ))}
      </ul>
      {erro && (
        <p role="alert" className="text-saida">
          {erro}
        </p>
      )}
      <button
        type="button"
        disabled={salvando}
        onClick={() => void salvar()}
        className="self-end rounded-full bg-primaria px-6 py-3 font-medium text-primaria-texto transition-opacity disabled:opacity-50"
      >
        {salvando ? 'Salvando…' : 'Salvar'}
      </button>
    </Dialogo>
  )
}

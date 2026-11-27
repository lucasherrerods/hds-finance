import { ArrowLeft, CalendarRange, Check, ChevronRight, Lightbulb } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Dialogo, formatarMes, formatarMoeda } from '../../shared'
import type { GrupoDeCategoria } from '../import'
import { buscarMesesSemCategoria, buscarSugestoes, corrigirCategoria, type MesSemCategoria, type SugestaoDeCategoria } from './api'

type Props = {
  /** As categorias que dá para escolher no lugar da sugerida. */
  categorias: string[]
  grupos?: GrupoDeCategoria[]
  /** Chamado depois de aplicar, para o painel buscar o histórico de novo. */
  aoAceitar?: (mensagem: string) => void
  aoFechar: () => void
}

type Estado =
  | { tipo: 'contando' }
  | { tipo: 'meses'; meses: MesSemCategoria[] }
  | { tipo: 'buscando' }
  | { tipo: 'pronto'; sugestoes: SugestaoDeCategoria[] }
  | { tipo: 'erro'; mensagem: string; escolheu: boolean }

const chaveDo = (m: MesSemCategoria) => `${m.ano}-${String(m.mes).padStart(2, '0')}`

const botao =
  'flex items-center gap-2 rounded-full border border-borda bg-superficie px-4 py-2 text-sm font-medium hover:border-primaria disabled:opacity-50'

/**
 * Área admin: a IA sugere uma categoria para o que as regras não reconheceram. A pessoa pode trocar
 * a sugestão antes de aplicar; aplicar vira categoria aprendida, aqui e nas próximas importações.
 */
export function SugestoesDeCategoria({ categorias, grupos, aoAceitar, aoFechar }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'contando' })
  const [escolhas, setEscolhas] = useState<Record<string, string>>({})
  const [aviso, setAviso] = useState<string | null>(null)

  // Primeiro só conta os meses, sem IA: ela é chamada depois que o admin escolhe o recorte.
  const contar = useCallback(async () => {
    setEstado({ tipo: 'contando' })
    setAviso(null)
    const resultado = await buscarMesesSemCategoria()
    setEstado(resultado.ok ? { tipo: 'meses', meses: resultado.meses } : { tipo: 'erro', mensagem: resultado.mensagem, escolheu: false })
  }, [])

  useEffect(() => {
    void contar()
  }, [contar])

  async function sugerir(mes?: string) {
    setEstado({ tipo: 'buscando' })
    const resultado = await buscarSugestoes(mes)
    setEstado(resultado.ok ? { tipo: 'pronto', sugestoes: resultado.sugestoes } : { tipo: 'erro', mensagem: resultado.mensagem, escolheu: true })
  }

  async function aplicar(sugestao: SugestaoDeCategoria) {
    const categoria = escolhas[sugestao.descricao] ?? sugestao.categoria
    const resultado = await corrigirCategoria(sugestao.descricao, categoria)
    if (!resultado.ok) return setAviso(resultado.mensagem)
    setEstado((atual) =>
      atual.tipo === 'pronto' ? { tipo: 'pronto', sugestoes: atual.sugestoes.filter((s) => s.descricao !== sugestao.descricao) } : atual,
    )
    aoAceitar?.(`"${sugestao.descricao}" agora é ${categoria} em todas, aqui e nas próximas importações.`)
  }

  const escolhiveis = categorias.filter((c) => c !== 'Sem categoria')
  const agrupadas = grupos
    ?.map((g) => ({ nome: g.nome, categorias: g.categorias.filter((c) => escolhiveis.includes(c)) }))
    .filter((g) => g.categorias.length > 0)

  return (
    <Dialogo
      rotulo="Sugestões de categoria"
      aoFechar={aoFechar}
      className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl rounded-2xl border"
      cabecalho={
        <h2 className="flex items-center gap-2 text-2xl leading-tight font-bold tracking-[-0.02em]">
          <Lightbulb aria-hidden className="size-6 text-primaria" />
          Sem categoria
        </h2>
      }
    >
      <p className="text-texto-suave">
        A IA sugere uma categoria para o que as regras não reconheceram. Troque se quiser e aplique: nada muda sem você aplicar.
      </p>
      {estado.tipo === 'contando' && <p role="status">Procurando gastos sem categoria…</p>}
      {estado.tipo === 'meses' && estado.meses.length === 0 && (
        <p role="status" className="text-texto-suave">
          Nenhum gasto sem categoria: está tudo categorizado.
        </p>
      )}
      {estado.tipo === 'meses' && estado.meses.length > 0 && <EscolhaDoMes meses={estado.meses} aoEscolher={(mes) => void sugerir(mes)} />}
      {(estado.tipo === 'pronto' || (estado.tipo === 'erro' && estado.escolheu)) && (
        <button type="button" onClick={() => void contar()} className="flex items-center gap-2 self-start text-sm text-texto-suave transition-colors hover:text-texto">
          <ArrowLeft aria-hidden className="size-4" />
          Trocar o mês
        </button>
      )}
      {estado.tipo === 'buscando' && <p role="status">Analisando os gastos sem categoria…</p>}
      {estado.tipo === 'erro' && (
        <p role="alert" className="text-saida">
          {estado.mensagem}
        </p>
      )}
      {estado.tipo === 'pronto' && estado.sugestoes.length === 0 && (
        <p role="status" className="text-texto-suave">
          Nenhuma sugestão: tudo categorizado ou a IA não respondeu.
        </p>
      )}
      {aviso && (
        <p role="alert" className="text-saida">
          {aviso}
        </p>
      )}
      {estado.tipo === 'pronto' && estado.sugestoes.length > 0 && (
        <ul className="flex flex-col divide-y divide-borda">
          {estado.sugestoes.map((s) => (
            <li key={s.descricao} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{s.descricao}</span>
                <span className="text-sm text-texto-suave">
                  {formatarMoeda(s.valor)}
                  {s.quantidade > 1 ? ` em ${s.quantidade} lançamentos` : ''}
                </span>
              </span>
              <select
                aria-label={`Categoria para ${s.descricao}`}
                value={escolhas[s.descricao] ?? s.categoria}
                onChange={(e) => setEscolhas({ ...escolhas, [s.descricao]: e.target.value })}
                className="h-10 max-w-full rounded-full border border-borda bg-fundo px-3 text-sm"
              >
                {agrupadas && agrupadas.length > 0
                  ? agrupadas.map((g) => (
                      <optgroup key={g.nome} label={g.nome}>
                        {g.categorias.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </optgroup>
                    ))
                  : escolhiveis.map((c) => <option key={c}>{c}</option>)}
              </select>
              <button type="button" onClick={() => void aplicar(s)} className={botao} aria-label={`Aplicar para ${s.descricao}`}>
                <Check aria-hidden className="size-4" />
                Aplicar
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialogo>
  )
}

function EscolhaDoMes({ meses, aoEscolher }: { meses: MesSemCategoria[]; aoEscolher: (mes?: string) => void }) {
  const total = meses.reduce((s, m) => s + m.quantidade, 0)
  return (
    <section aria-label="Escolha o mês" className="flex flex-col gap-3">
      <h3 className="text-sm text-texto-suave">Qual mês a IA deve olhar?</h3>
      <ul className="flex flex-col gap-2">
        <li>
          <OpcaoDeMes titulo="Todos os meses" quantidade={total} icone aoEscolher={() => aoEscolher()} />
        </li>
        {meses.map((m) => (
          <li key={chaveDo(m)}>
            <OpcaoDeMes titulo={formatarMes(m.ano, m.mes)} quantidade={m.quantidade} aoEscolher={() => aoEscolher(chaveDo(m))} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function OpcaoDeMes({ titulo, quantidade, icone = false, aoEscolher }: { titulo: string; quantidade: number; icone?: boolean; aoEscolher: () => void }) {
  return (
    <button
      type="button"
      onClick={aoEscolher}
      className="flex w-full items-center gap-3 rounded-xl border border-borda bg-fundo p-4 text-left transition-colors hover:border-primaria/40"
    >
      {icone && <CalendarRange aria-hidden className="size-5 shrink-0 opacity-70" />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium first-letter:uppercase">{titulo}</span>
        <span className="text-sm text-texto-suave">
          {quantidade} {quantidade === 1 ? 'gasto' : 'gastos'} sem categoria
        </span>
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 opacity-60" />
    </button>
  )
}

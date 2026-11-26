import { MessageCircleQuestion, Sparkles, TriangleAlert } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { buscarAnalise, perguntar, type Analise, type MesDoFechamento } from './api'

type Props = { mes: MesDoFechamento }

const cartao = 'flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-6'
const botao =
  'flex items-center gap-2 rounded-full border border-borda bg-superficie px-4 py-2 text-sm font-medium hover:border-primaria disabled:opacity-50'

/** Área admin: a análise do mês e as perguntas, feitas pela api com a IA. As sugestões de categoria ficam na aba Categorias. */
export function AssistenteDoMes({ mes }: Props) {
  return (
    <section aria-label="Assistente" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <AnaliseDoMes mes={mes} />
      <Pergunte />
    </section>
  )
}

/** Atalhos para as perguntas mais comuns: um clique e já pergunta. */
const PERGUNTAS_PRONTAS = [
  'Quanto gastei com Alimentação este mês?',
  'Onde mais gastei nos últimos 3 meses?',
  'Qual o resumo do mês passado?',
]

function AnaliseDoMes({ mes }: { mes: MesDoFechamento }) {
  const [analise, setAnalise] = useState<Analise | null | 'carregando'>('carregando')
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    buscarAnalise(mes).then((resultado) => {
      if (!ativo) return
      if (resultado.ok) setAnalise(resultado.analise)
      else {
        setAnalise(null)
        setErro(resultado.mensagem)
      }
    })
    return () => {
      ativo = false
    }
  }, [mes])

  return (
    <div className={cartao} aria-label="Análise do mês" role="group">
      <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <Sparkles aria-hidden className="size-5 text-primaria" />
        Análise do mês
      </h2>
      {analise === 'carregando' && <p className="text-texto-suave">Analisando…</p>}
      {erro && <p role="alert" className="text-saida">{erro}</p>}
      {analise && analise !== 'carregando' && (
        <>
          <p className={analise.comentario ? '' : 'text-texto-suave'}>
            {analise.comentario ?? 'O comentário da IA aparece aqui quando a chave do Gemini estiver configurada.'}
          </p>
          {analise.alertas.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {analise.alertas.map((alerta) => (
                <li key={`${alerta.tipo}-${alerta.assunto}`} className="flex items-start gap-2">
                  <TriangleAlert aria-hidden className="mt-1 size-4 shrink-0 text-saida" />
                  {alerta.texto}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-texto-suave">Nenhum gasto fora do padrão neste mês.</p>
          )}
        </>
      )}
    </div>
  )
}

function Pergunte() {
  const [pergunta, setPergunta] = useState('')
  const [resposta, setResposta] = useState<string | null>(null)
  const [pensando, setPensando] = useState(false)

  async function enviar(texto: string) {
    if (!texto.trim() || pensando) return
    setPergunta(texto)
    setPensando(true)
    const resultado = await perguntar(texto)
    setPensando(false)
    setResposta(resultado.ok ? resultado.resposta : resultado.mensagem)
  }

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        void enviar(pergunta)
      }}
      className={cartao}
    >
      <label htmlFor="pergunta" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <MessageCircleQuestion aria-hidden className="size-5 text-primaria" />
        Pergunte
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="pergunta"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          maxLength={300}
          placeholder="Quanto gastei com Alimentação este ano?"
          className="min-w-0 flex-1 rounded-full border border-borda bg-fundo px-4 py-2"
        />
        <button type="submit" disabled={pensando} className={botao}>
          {pensando ? 'Pensando…' : 'Perguntar'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Perguntas prontas" role="group">
        {PERGUNTAS_PRONTAS.map((pronta) => (
          <button
            key={pronta}
            type="button"
            disabled={pensando}
            onClick={() => void enviar(pronta)}
            className="rounded-full bg-fundo px-3 py-1.5 text-sm text-texto-suave transition-colors hover:text-texto disabled:opacity-50"
          >
            {pronta}
          </button>
        ))}
      </div>
      {resposta && (
        <p role="status" className="whitespace-pre-line">
          {resposta}
        </p>
      )}
    </form>
  )
}

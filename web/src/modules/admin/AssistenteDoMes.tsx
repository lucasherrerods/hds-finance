import { Check, Lightbulb, MessageCircleQuestion, Sparkles, TriangleAlert } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { formatarMoeda } from '../../shared'
import {
  buscarAnalise,
  buscarSugestoes,
  corrigirCategoria,
  perguntar,
  type Analise,
  type MesDoFechamento,
  type SugestaoDeCategoria,
} from './api'

type Props = {
  mes: MesDoFechamento
  /** Chamado depois de aceitar uma sugestão, para o painel buscar o histórico de novo. */
  aoAceitar?: (mensagem: string) => void
}

const cartao = 'flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-6'
const botao =
  'flex items-center gap-2 rounded-full border border-borda bg-superficie px-4 py-2 text-sm font-medium hover:border-primaria disabled:opacity-50'

/** Área admin: a análise do mês, as sugestões de categoria e as perguntas, todas feitas pela api com a IA. */
export function AssistenteDoMes({ mes, aoAceitar }: Props) {
  return (
    <section aria-label="Assistente" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <AnaliseDoMes mes={mes} />
      <div className="flex flex-col gap-4">
        <Pergunte />
        <Sugestoes aoAceitar={aoAceitar} />
      </div>
    </section>
  )
}

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

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!pergunta.trim()) return
    setPensando(true)
    const resultado = await perguntar(pergunta)
    setPensando(false)
    setResposta(resultado.ok ? resultado.resposta : resultado.mensagem)
  }

  return (
    <form onSubmit={(e) => void enviar(e)} className={cartao}>
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
      {resposta && (
        <p role="status" className="whitespace-pre-line">
          {resposta}
        </p>
      )}
    </form>
  )
}

function Sugestoes({ aoAceitar }: { aoAceitar?: (mensagem: string) => void }) {
  const [sugestoes, setSugestoes] = useState<SugestaoDeCategoria[] | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)

  async function buscar() {
    setBuscando(true)
    const resultado = await buscarSugestoes()
    setBuscando(false)
    if (resultado.ok) {
      setSugestoes(resultado.sugestoes)
      setMensagem(resultado.sugestoes.length ? null : 'Nenhuma sugestão: tudo categorizado ou a IA não está configurada.')
    } else setMensagem(resultado.mensagem)
  }

  async function aceitar(sugestao: SugestaoDeCategoria) {
    const resultado = await corrigirCategoria(sugestao.descricao, sugestao.categoria)
    if (!resultado.ok) return setMensagem(resultado.mensagem)
    setSugestoes((atuais) => atuais?.filter((s) => s.descricao !== sugestao.descricao) ?? null)
    aoAceitar?.(`"${sugestao.descricao}" agora é ${sugestao.categoria} em todas, aqui e nas próximas importações.`)
  }

  return (
    <div className={cartao} aria-label="Sugestões de categoria" role="group">
      <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <Lightbulb aria-hidden className="size-5 text-primaria" />
        Sem categoria
      </h2>
      <p className="text-texto-suave">A IA sugere uma categoria para o que as regras não reconheceram. Nada muda sem você aceitar.</p>
      <button type="button" onClick={() => void buscar()} disabled={buscando} className={`self-start ${botao}`}>
        {buscando ? 'Buscando…' : 'Sugerir categorias'}
      </button>
      {mensagem && <p role="status" className="text-texto-suave">{mensagem}</p>}
      {sugestoes && sugestoes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {sugestoes.map((s) => (
            <li key={s.descricao} className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="font-medium">{s.descricao}</span>
                <span className="text-texto-suave"> · {formatarMoeda(s.valor)} → {s.categoria}</span>
              </span>
              <button type="button" onClick={() => void aceitar(s)} className={botao} aria-label={`Aceitar ${s.categoria} para ${s.descricao}`}>
                <Check aria-hidden className="size-4" />
                Aceitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

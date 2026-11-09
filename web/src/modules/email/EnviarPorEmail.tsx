import { Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { confirmarCodigo, enviarRelatorioPorEmail, pedirCodigo, type MesDoEnvio } from './api'
import {
  esquecerEmail,
  lerEmailConfirmado,
  lerEmailDigitado,
  salvarConfirmacao,
  salvarEmailDigitado,
  type EmailConfirmado,
} from './armazenamento'

type Props = { arquivo: File; mes: MesDoEnvio }

type Etapa =
  | { tipo: 'email' }
  | { tipo: 'codigo'; desafio: string }
  | { tipo: 'pronto'; confirmado: EmailConfirmado }
  | { tipo: 'enviado'; email: string }

const etapaInicial = (): Etapa => {
  const confirmado = lerEmailConfirmado()
  return confirmado ? { tipo: 'pronto', confirmado } : { tipo: 'email' }
}

const campo = 'rounded-lg border border-borda bg-fundo px-4 py-2 text-texto focus:border-primaria focus:outline-none'
const botao =
  'rounded-lg bg-superficie px-6 py-3 font-medium shadow-elevacao transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50'
const link = 'text-sm text-texto-suave underline-offset-4 hover:text-texto hover:underline'

/** Na primeira vez confirma o e-mail com um código. Depois, o navegador lembra e o envio é um clique. */
export function EnviarPorEmail({ arquivo, mes }: Props) {
  const [etapa, setEtapa] = useState<Etapa>(etapaInicial)
  const [email, setEmail] = useState(lerEmailDigitado)
  const [codigo, setCodigo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function executar(acao: () => Promise<void>) {
    setOcupado(true)
    setErro(null)
    await acao()
    setOcupado(false)
  }

  const pedir = (evento: FormEvent) => {
    evento.preventDefault()
    return executar(async () => {
      salvarEmailDigitado(email)
      const resultado = await pedirCodigo(email)
      if (resultado.ok) setEtapa({ tipo: 'codigo', desafio: resultado.desafio })
      else setErro(resultado.mensagem)
    })
  }

  const confirmar = (evento: FormEvent, desafio: string) => {
    evento.preventDefault()
    return executar(async () => {
      const resultado = await confirmarCodigo(email, codigo, desafio)
      if (!resultado.ok) return setErro(resultado.mensagem)
      salvarConfirmacao(email, resultado.token)
      setCodigo('')
      setEtapa({ tipo: 'pronto', confirmado: { email, token: resultado.token } })
    })
  }

  const enviar = ({ email: destino, token }: EmailConfirmado) =>
    executar(async () => {
      const resultado = await enviarRelatorioPorEmail(arquivo, mes, destino, token)
      if (resultado.ok) return setEtapa({ tipo: 'enviado', email: destino })
      setErro(resultado.mensagem)
      if (resultado.confirmarDeNovo) {
        esquecerEmail()
        setEmail(destino)
        setEtapa({ tipo: 'email' })
      }
    })

  function trocar() {
    esquecerEmail()
    setEmail('')
    setErro(null)
    setEtapa({ tipo: 'email' })
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {etapa.tipo === 'email' && (
        <form onSubmit={pedir} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-texto-suave">
            Seu e-mail
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
          </label>
          <button type="submit" disabled={ocupado || !email} className={botao}>
            {ocupado ? 'Mandando…' : 'Mandar código'}
          </button>
        </form>
      )}

      {etapa.tipo === 'codigo' && (
        <form onSubmit={(e) => confirmar(e, etapa.desafio)} className="flex flex-col items-start gap-3">
          <p className="text-sm text-texto-suave">Mandamos um código de 6 dígitos para {email}. Ele vale por 10 minutos.</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-texto-suave">
              Código
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className={`${campo} w-32 tracking-[0.3em] tabular-nums`}
              />
            </label>
            <button type="submit" disabled={ocupado || codigo.length < 6} className={botao}>
              {ocupado ? 'Conferindo…' : 'Confirmar'}
            </button>
          </div>
          <button type="button" onClick={() => setEtapa({ tipo: 'email' })} className={link}>
            Voltar
          </button>
        </form>
      )}

      {etapa.tipo === 'pronto' && (
        <>
          <button type="button" onClick={() => enviar(etapa.confirmado)} disabled={ocupado} className={`${botao} flex items-center gap-2`}>
            <Mail aria-hidden className="size-4 opacity-70" />
            {ocupado ? 'Enviando…' : `Enviar PDF para ${etapa.confirmado.email}`}
          </button>
          <button type="button" onClick={trocar} className={link}>
            Trocar e-mail
          </button>
        </>
      )}

      {etapa.tipo === 'enviado' && <p className="text-entrada">Enviado para {etapa.email}. Confira a caixa de entrada.</p>}

      {erro && (
        <p role="alert" className="text-saida">
          {erro}
        </p>
      )}
    </div>
  )
}

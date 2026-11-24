import { KeyRound, Lock, Wallet } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { confirmarCodigo, pedirCodigo } from '../modules/admin'

type Etapa = 'email' | 'codigo'

const campo =
  'w-full rounded-full border border-borda bg-superficie px-6 py-3 outline-none placeholder:text-texto-suave focus-visible:border-primaria'
const botao =
  'rounded-full bg-primaria px-6 py-3 font-semibold text-primaria-texto shadow-[0_0_24px_var(--color-brilho)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50'

/** Entrada da área admin. Não tem link no site: só quem sabe o endereço chega aqui. */
export function PaginaDeEntrada() {
  const [etapa, setEtapa] = useState<Etapa>('email')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const navegar = useNavigate()

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    const resultado = etapa === 'email' ? await pedirCodigo(email) : await confirmarCodigo(codigo)
    setEnviando(false)

    if (!resultado.ok) return setErro(resultado.mensagem)
    if (etapa === 'email') return setEtapa('codigo')
    navegar('/admin', { replace: true })
  }

  return (
    <div className="relative isolate flex min-h-svh flex-col items-center justify-center px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[28rem] max-w-3xl rounded-full bg-brilho opacity-60 blur-[120px]"
      />
      <Link to="/" className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Wallet aria-hidden className="size-5 text-primaria" />
        hds finance
      </Link>
      <form onSubmit={enviar} className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-borda bg-superficie/80 p-8 backdrop-blur-xl">
        <span className="grid size-12 place-items-center rounded-2xl border border-primaria/30 bg-primaria-suave text-primaria">
          {etapa === 'email' ? <Lock aria-hidden className="size-5" /> : <KeyRound aria-hidden className="size-5" />}
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Área restrita</h1>
        {etapa === 'email' ? (
          <>
            <p className="text-texto-suave">Digite o seu e-mail para receber um código de acesso.</p>
            <label className="sr-only" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={campo}
            />
            <button type="submit" disabled={enviando} className={botao}>
              {enviando ? 'Enviando…' : 'Receber código'}
            </button>
          </>
        ) : (
          <>
            <p role="status" className="text-texto-suave">
              Se esse e-mail tiver acesso, o código chega em instantes. Ele vale por 10 minutos.
            </p>
            <label className="sr-only" htmlFor="codigo">
              Código
            </label>
            <input
              id="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              placeholder="000000"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className={`${campo} text-center text-xl tracking-[0.5em] tabular-nums`}
            />
            <button type="submit" disabled={enviando} className={botao}>
              {enviando ? 'Conferindo…' : 'Entrar'}
            </button>
            <button type="button" onClick={() => setEtapa('email')} className="text-sm text-texto-suave hover:text-texto">
              Usar outro e-mail
            </button>
          </>
        )}
        {erro && (
          <p role="alert" className="text-saida">
            {erro}
          </p>
        )}
      </form>
    </div>
  )
}

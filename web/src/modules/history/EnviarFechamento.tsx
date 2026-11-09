import { Mail, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { enviarFechamento, type MesDoFechamento } from './api'

type Props = { mes: MesDoFechamento }

type Situacao = { tipo: 'parado' } | { tipo: 'enviado'; mensagem: string } | { tipo: 'erro'; mensagem: string; jaEnviado: boolean }

const botao =
  'flex items-center gap-2 rounded-lg bg-superficie px-6 py-3 font-medium shadow-elevacao transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50'

/** Modo pessoal: manda o fechamento para o e-mail configurado na api. Um mês já enviado só sai de novo se a pessoa pedir. */
export function EnviarFechamento({ mes }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [situacao, setSituacao] = useState<Situacao>({ tipo: 'parado' })

  async function enviar(forcar: boolean) {
    setEnviando(true)
    const resultado = await enviarFechamento(mes, forcar)
    setEnviando(false)
    setSituacao(resultado.ok ? { tipo: 'enviado', mensagem: resultado.mensagem } : { tipo: 'erro', ...resultado })
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <button type="button" onClick={() => enviar(false)} disabled={enviando} className={botao}>
        <Mail aria-hidden className="size-4 opacity-70" />
        {enviando ? 'Enviando…' : 'Enviar fechamento'}
      </button>
      {situacao.tipo === 'enviado' && (
        <p role="status" className="text-entrada">
          {situacao.mensagem}
        </p>
      )}
      {situacao.tipo === 'erro' && (
        <>
          <p role="alert" className="text-saida">
            {situacao.mensagem}
          </p>
          {situacao.jaEnviado && (
            <button type="button" onClick={() => enviar(true)} disabled={enviando} className={botao}>
              <RotateCw aria-hidden className="size-4 opacity-70" />
              Enviar de novo
            </button>
          )}
        </>
      )}
    </div>
  )
}

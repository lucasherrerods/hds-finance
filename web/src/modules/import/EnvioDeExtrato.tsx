import { FileUp } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { enviarExtrato, type ResumoDoExtrato } from './api'

type Props = { aoResumir: (resumo: ResumoDoExtrato) => void }

export function EnvioDeExtrato({ aoResumir }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!arquivo) return

    setEnviando(true)
    setErro(null)
    const resultado = await enviarExtrato(arquivo)
    setEnviando(false)

    if (resultado.ok) aoResumir(resultado.resumo)
    else setErro(resultado.mensagem)
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4 rounded-2xl bg-superficie p-6 shadow-elevacao">
      <label htmlFor="extrato" className="flex items-center gap-2 font-medium">
        <FileUp aria-hidden className="size-5 opacity-60" />
        Extrato do Inter (.ofx ou .csv)
      </label>
      <input
        id="extrato"
        type="file"
        accept=".ofx,.csv"
        onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
        className="text-texto-suave file:mr-4 file:rounded-lg file:border-0 file:bg-fundo file:px-4 file:py-2 file:text-texto"
      />
      <button
        type="submit"
        disabled={!arquivo || enviando}
        className="self-start rounded-lg bg-primaria px-6 py-3 font-medium text-primaria-texto disabled:opacity-50"
      >
        {enviando ? 'Lendo extrato…' : 'Ver resumo'}
      </button>
      {erro && (
        <p role="alert" className="text-saida">
          {erro}
        </p>
      )}
    </form>
  )
}

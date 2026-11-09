import { FileCheck2, FileUp } from 'lucide-react'
import { motion } from 'motion/react'
import { useState, type DragEvent, type FormEvent } from 'react'
import { enviarExtrato, type ResumoDoExtrato } from './api'

type Props = { aoResumir: (resumo: ResumoDoExtrato) => void }

export function EnvioDeExtrato({ aoResumir }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function escolher(novo: File | null) {
    setArquivo(novo)
    setErro(null)
  }

  function soltar(evento: DragEvent) {
    evento.preventDefault()
    setArrastando(false)
    escolher(evento.dataTransfer.files[0] ?? null)
  }

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

  const Icone = arquivo ? FileCheck2 : FileUp

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <motion.label
        htmlFor="extrato"
        data-testid="area-do-arquivo"
        onDragOver={(e) => {
          e.preventDefault()
          setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
        animate={{ scale: arrastando ? 1.02 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`flex cursor-pointer flex-col items-center gap-4 rounded-3xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
          arrastando ? 'border-primaria bg-primaria-suave' : 'border-borda bg-superficie hover:border-primaria'
        }`}
      >
        <motion.span
          key={arquivo ? 'escolhido' : 'vazio'}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          className="grid size-14 place-items-center rounded-2xl bg-primaria-suave text-primaria"
        >
          <Icone aria-hidden className="size-7" />
        </motion.span>
        {arquivo ? (
          <span className="text-xl font-semibold tracking-tight">{arquivo.name}</span>
        ) : (
          <span className="text-xl font-semibold tracking-tight">Arrasta o arquivo pra cá</span>
        )}
        <span className="text-texto-suave">
          {arquivo ? 'Clique para trocar de arquivo.' : 'Ou clique para escolher. Extrato do Inter (.ofx ou .csv), até 2 MB.'}
        </span>
        <input
          id="extrato"
          type="file"
          accept=".ofx,.csv"
          onChange={(e) => escolher(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </motion.label>
      <button
        type="submit"
        disabled={!arquivo || enviando}
        className="self-start rounded-lg bg-primaria px-6 py-3 font-medium text-primaria-texto transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
      >
        {enviando ? 'Fazendo as contas…' : 'Ver resumo'}
      </button>
      {erro && (
        <p role="alert" className="text-saida">
          {erro}
        </p>
      )}
    </form>
  )
}

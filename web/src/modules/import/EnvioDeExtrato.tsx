import { FileCheck2, FileUp, FlaskConical } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState, type DragEvent, type FormEvent } from 'react'
import { enviarExtrato, type ResumoDoExtrato } from './api'
import { extratoDeExemplo } from './extratoDeExemplo'

type Props = { aoResumir: (resumo: ResumoDoExtrato, arquivos: File[]) => void }

export function EnvioDeExtrato({ aoResumir }: Props) {
  const [arquivos, setArquivos] = useState<File[]>([])
  const [arrastando, setArrastando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [demorando, setDemorando] = useState(false)

  // A api dorme quando fica parada; a primeira requisição pode levar quase um minuto.
  useEffect(() => {
    if (!enviando) return
    const relogio = setTimeout(() => setDemorando(true), 4000)
    return () => {
      clearTimeout(relogio)
      setDemorando(false)
    }
  }, [enviando])

  function escolher(novos: FileList | null | undefined) {
    setArquivos(Array.from(novos ?? []))
    setErro(null)
  }

  function soltar(evento: DragEvent) {
    evento.preventDefault()
    setArrastando(false)
    escolher(evento.dataTransfer.files)
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (arquivos.length > 0) void resumir(arquivos)
  }

  async function resumir(escolhidos: File[]) {
    setEnviando(true)
    setErro(null)
    const resultado = await enviarExtrato(escolhidos)
    setEnviando(false)

    if (resultado.ok) aoResumir(resultado.resumo, escolhidos)
    else setErro(resultado.mensagem)
  }

  const temArquivo = arquivos.length > 0
  const Icone = temArquivo ? FileCheck2 : FileUp

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
        className={`relative isolate flex cursor-pointer flex-col items-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed px-6 py-20 text-center transition-colors ${
          arrastando ? 'border-primaria bg-primaria-suave' : 'border-borda bg-superficie hover:border-primaria'
        }`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -z-10 size-72 -translate-x-1/2 rounded-full bg-brilho blur-3xl"
        />
        <motion.span
          key={temArquivo ? 'escolhido' : 'vazio'}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          className="grid size-16 place-items-center rounded-2xl border border-primaria/30 bg-primaria-suave text-primaria"
        >
          <Icone aria-hidden className="size-7" />
        </motion.span>
        {temArquivo ? (
          <span className="text-xl font-semibold tracking-tight break-all">{arquivos.map((a) => a.name).join(', ')}</span>
        ) : (
          <span className="text-xl font-semibold tracking-tight">Arrasta os arquivos pra cá</span>
        )}
        <span className="text-texto-suave">
          {temArquivo ? 'Clique para trocar os arquivos.' : 'Ou clique para escolher um ou mais. Extratos do Inter (.ofx ou .csv) e do Nubank (.csv), até 2 MB no total.'}
        </span>
        <input
          id="extrato"
          type="file"
          accept=".ofx,.csv"
          multiple
          onChange={(e) => escolher(e.target.files)}
          className="sr-only"
        />
      </motion.label>
      <div className="flex flex-wrap gap-4">
        <button
          type="submit"
          disabled={!temArquivo || enviando}
          className="rounded-full bg-primaria px-6 py-3 font-semibold text-primaria-texto transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
        >
          {enviando ? 'Fazendo as contas…' : 'Ver resumo'}
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={() => void resumir([extratoDeExemplo(new Date())])}
          className="flex items-center gap-2 rounded-full border border-borda bg-superficie px-6 py-3 font-medium transition-colors hover:border-primaria disabled:opacity-50"
        >
          <FlaskConical aria-hidden className="size-4 opacity-70" />
          Testar com dados fictícios
        </button>
      </div>
      {demorando && (
        <p role="status" className="text-texto-suave">
          O servidor pode estar acordando. Na primeira vez do dia isso leva até um minuto.
        </p>
      )}
      {erro && (
        <p role="alert" className="text-saida">
          {erro}
        </p>
      )}
    </form>
  )
}

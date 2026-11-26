import { FileCheck2, FileUp, FlaskConical } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState, type DragEvent, type FormEvent } from 'react'
import { enviarExtrato, type ResumoDoExtrato } from './api'
import { extratoDeExemplo } from './extratoDeExemplo'

type Props = { aoResumir: (resumo: ResumoDoExtrato, arquivo: File) => void }

export function EnvioDeExtrato({ aoResumir }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null)
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

  function escolher(novo: File | null) {
    setArquivo(novo)
    setErro(null)
  }

  function soltar(evento: DragEvent) {
    evento.preventDefault()
    setArrastando(false)
    escolher(evento.dataTransfer.files[0] ?? null)
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (arquivo) void resumir(arquivo)
  }

  async function resumir(arquivo: File) {
    setEnviando(true)
    setErro(null)
    const resultado = await enviarExtrato(arquivo)
    setEnviando(false)

    if (resultado.ok) aoResumir(resultado.resumo, arquivo)
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
        className={`relative isolate flex cursor-pointer flex-col items-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed px-6 py-20 text-center transition-colors ${
          arrastando ? 'border-primaria bg-primaria-suave' : 'border-borda bg-superficie hover:border-primaria'
        }`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -z-10 size-72 -translate-x-1/2 rounded-full bg-brilho blur-3xl"
        />
        <motion.span
          key={arquivo ? 'escolhido' : 'vazio'}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          className="grid size-16 place-items-center rounded-2xl border border-primaria/30 bg-primaria-suave text-primaria"
        >
          <Icone aria-hidden className="size-7" />
        </motion.span>
        {arquivo ? (
          <span className="text-xl font-semibold tracking-tight">{arquivo.name}</span>
        ) : (
          <span className="text-xl font-semibold tracking-tight">Arrasta o arquivo pra cá</span>
        )}
        <span className="text-texto-suave">
          {arquivo ? 'Clique para trocar de arquivo.' : 'Ou clique para escolher. Extrato do Inter (.ofx ou .csv) ou do Nubank (.csv), até 2 MB.'}
        </span>
        <input
          id="extrato"
          type="file"
          accept=".ofx,.csv"
          onChange={(e) => escolher(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </motion.label>
      <div className="flex flex-wrap gap-4">
        <button
          type="submit"
          disabled={!arquivo || enviando}
          className="rounded-full bg-primaria px-6 py-3 font-semibold text-primaria-texto transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
        >
          {enviando ? 'Fazendo as contas…' : 'Ver resumo'}
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={() => void resumir(extratoDeExemplo(new Date()))}
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

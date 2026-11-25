import { FileText, Image, Share2 } from 'lucide-react'
import { useState } from 'react'
import type { Ajuste, ResumoMensal } from '../import'
import { entregar, gerarPdf, nomeDaImagem, nomeDoPdf } from './arquivos'
import { conteudoDaImagem, desenharImagem } from './imagemDoMes'

type Props = { arquivo?: File; ajustes?: Ajuste[]; mes: ResumoMensal }

const botao =
  'flex items-center gap-2 rounded-full border border-borda bg-superficie px-6 py-3 font-medium transition-colors hover:border-primaria disabled:opacity-50'

const avisos = { compartilhado: null, cancelado: null, baixado: 'Arquivo baixado.', 'precisa-de-toque': null }

/** A imagem sai do navegador; o PDF, da api. Nenhum dos dois fica guardado. */
export function CompartilharMes({ arquivo, ajustes, mes }: Props) {
  const [esconder, setEsconder] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pronto, setPronto] = useState<File | null>(null)

  async function compartilhar(gerar: () => Promise<File | string>) {
    setOcupado(true)
    setAviso(null)
    setPronto(null)
    const gerado = await gerar()
    setOcupado(false)
    if (typeof gerado === 'string') return setAviso(gerado)
    const entrega = await entregar(gerado)
    if (entrega === 'precisa-de-toque') setPronto(gerado)
    setAviso(avisos[entrega])
  }

  async function imagem() {
    const blob = await desenharImagem(conteudoDaImagem(mes, esconder))
    return blob ? new File([blob], nomeDaImagem(mes), { type: 'image/png' }) : 'Seu navegador não conseguiu criar a imagem.'
  }

  async function pdf() {
    const resultado = await gerarPdf(mes, arquivo, ajustes)
    return resultado.ok ? new File([resultado.pdf], nomeDoPdf(mes), { type: 'application/pdf' }) : resultado.mensagem
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={esconder} onChange={(e) => setEsconder(e.target.checked)} className="size-4 accent-primaria" />
        Esconder os valores na imagem
      </label>
      <div className="flex flex-wrap gap-4">
        <button type="button" disabled={ocupado} onClick={() => void compartilhar(imagem)} className={botao}>
          <Image aria-hidden className="size-4 opacity-70" />
          Compartilhar imagem
        </button>
        <button type="button" disabled={ocupado} onClick={() => void compartilhar(pdf)} className={botao}>
          <FileText aria-hidden className="size-4 opacity-70" />
          Compartilhar PDF
        </button>
      </div>
      <p className="text-sm text-texto-suave">O PDF sempre mostra os valores.</p>
      {pronto && (
        <button type="button" onClick={() => void compartilhar(() => Promise.resolve(pronto))} className={botao}>
          <Share2 aria-hidden className="size-4 opacity-70" />
          Pronto, toque para enviar
        </button>
      )}
      <p role="status" className="text-texto-suave empty:hidden">
        {ocupado ? 'Preparando…' : aviso}
      </p>
    </div>
  )
}

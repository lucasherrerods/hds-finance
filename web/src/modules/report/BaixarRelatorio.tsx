import { FileDown } from 'lucide-react'
import { useState } from 'react'
import { baixarRelatorio, type MesDoRelatorio } from './api'

type Props = { arquivo: File; mes: MesDoRelatorio }

const nomeDoArquivo = ({ ano, mes }: MesDoRelatorio) => `fechamento-${ano}-${String(mes).padStart(2, '0')}.pdf`

function salvar(pdf: Blob, nome: string) {
  const endereco = URL.createObjectURL(pdf)
  const link = document.createElement('a')
  link.href = endereco
  link.download = nome
  link.click()
  URL.revokeObjectURL(endereco)
}

export function BaixarRelatorio({ arquivo, mes }: Props) {
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function baixar() {
    setGerando(true)
    setErro(null)
    const resultado = await baixarRelatorio(arquivo, mes)
    setGerando(false)

    if (resultado.ok) salvar(resultado.pdf, nomeDoArquivo(mes))
    else setErro(resultado.mensagem)
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={baixar}
        disabled={gerando}
        className="flex items-center gap-2 rounded-lg bg-superficie px-6 py-3 font-medium shadow-elevacao transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
      >
        <FileDown aria-hidden className="size-4 opacity-70" />
        {gerando ? 'Montando o PDF…' : 'Baixar PDF do mês'}
      </button>
      {erro && (
        <p role="alert" className="text-saida">
          {erro}
        </p>
      )}
    </div>
  )
}

import { FilePlus2 } from 'lucide-react'
import { useId, useState, type ChangeEvent } from 'react'
import { adicionarExtrato } from './api'

type Props = {
  /** Recebe a frase do que aconteceu, para quem mostra o aviso recarregar o histórico. */
  aoImportar: (mensagem: string) => void
  className?: string
  rotulo?: string
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** Um botão que abre o seletor de arquivos e importa no histórico local. */
export function AdicionarExtrato({ aoImportar, className = '', rotulo = 'Adicionar extrato' }: Props) {
  const id = useId()
  const [importando, setImportando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function importar(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return

    setImportando(true)
    setErro(null)
    const resultado = await adicionarExtrato(arquivo)
    setImportando(false)

    if (!resultado.ok) return setErro(resultado.mensagem)
    const novas = plural(resultado.transacoesNovas, 'transação nova', 'transações novas')
    const repetidas = plural(resultado.duplicadas, 'já existia', 'já existiam')
    aoImportar(`${novas}, ${repetidas}. ${resultado.fechamento}`)
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        aria-busy={importando}
        className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors ${className}`}
      >
        <FilePlus2 aria-hidden className="size-5" />
        {importando ? 'Importando…' : rotulo}
        <input id={id} type="file" accept=".ofx,.csv" onChange={importar} disabled={importando} className="sr-only" />
      </label>
      {erro && (
        <p role="alert" className="text-sm text-saida">
          {erro}
        </p>
      )}
    </div>
  )
}

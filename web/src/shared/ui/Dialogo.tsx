import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

type Props = { rotulo: string; aoFechar: () => void; cabecalho: ReactNode; children: ReactNode; className: string }

/** Abre ao ser montado. O dialog nativo cuida do foco e do Esc; clicar fora também fecha. */
export function Dialogo({ rotulo, aoFechar, cabecalho, children, className }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const atual = dialogo.current
    if (atual && !atual.open) atual.showModal()
  }, [])

  return (
    <dialog
      ref={dialogo}
      aria-label={rotulo}
      onClose={aoFechar}
      onClick={(e) => e.target === e.currentTarget && dialogo.current?.close()}
      className={`overflow-y-auto overscroll-contain border-borda bg-superficie text-texto backdrop:bg-fundo/80 ${className}`}
    >
      <div className="flex min-h-full flex-col gap-6 p-6">
        <header className="flex items-center gap-4">
          {cabecalho}
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => dialogo.current?.close()}
            className="ml-auto grid size-10 shrink-0 place-items-center rounded-full text-texto-suave transition-colors hover:bg-fundo hover:text-texto"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}

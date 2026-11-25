import type { LucideIcon } from 'lucide-react'

type SetaProps = { rotulo: string; icone: LucideIcon; ativa: boolean; aoClicar: () => void }

/** Botão redondo de anterior e seguinte. */
export function Seta({ rotulo, icone: Icone, ativa, aoClicar }: SetaProps) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      disabled={!ativa}
      onClick={aoClicar}
      className="grid size-10 place-items-center rounded-full text-texto-suave transition-colors enabled:hover:bg-fundo enabled:hover:text-texto disabled:opacity-30"
    >
      <Icone aria-hidden className="size-4" />
    </button>
  )
}

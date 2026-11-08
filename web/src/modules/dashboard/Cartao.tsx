import type { ReactNode } from 'react'

type Props = { titulo: string; children: ReactNode; className?: string }

/** Cartão do painel: título em caixa alta discreto e conteúdo. */
export function Cartao({ titulo, children, className = '' }: Props) {
  return (
    <section aria-label={titulo} className={`flex flex-col gap-4 rounded-2xl bg-superficie p-6 shadow-elevacao ${className}`}>
      <h3 className="text-sm font-medium tracking-wider text-texto-suave uppercase">{titulo}</h3>
      {children}
    </section>
  )
}

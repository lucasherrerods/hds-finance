import type { ReactNode } from 'react'
import { Revelar } from '../../shared'

type Props = { id: string; titulo: string; descricao: string; children: ReactNode }

export function Secao({ id, titulo, descricao, children }: Props) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-24">
      <Revelar className="flex max-w-[60ch] flex-col gap-4">
        <h2 id={`${id}-titulo`} className="text-3xl leading-tight font-bold tracking-[-0.02em] sm:text-4xl">
          {titulo}
        </h2>
        <p className="text-lg text-texto-suave">{descricao}</p>
      </Revelar>
      {children}
    </section>
  )
}

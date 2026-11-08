import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { Revelar } from '../../shared'

export function ChamadaFinal() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Revelar className="flex flex-col items-start gap-6 rounded-3xl bg-primaria-suave p-8 sm:p-12">
        <h2 className="max-w-[24ch] text-3xl leading-tight font-bold tracking-[-0.02em] sm:text-4xl">
          Pronto para ver o seu mês?
        </h2>
        <p className="max-w-[60ch] text-lg text-texto-suave">
          Leva menos de um minuto: exporte o extrato no app do Inter e envie o arquivo.
        </p>
        <Link
          to="/testar"
          className="group flex items-center gap-2 rounded-lg bg-primaria px-6 py-3 font-medium text-primaria-texto transition-transform hover:-translate-y-0.5"
        >
          Testar com meu extrato
          <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </Revelar>
    </section>
  )
}

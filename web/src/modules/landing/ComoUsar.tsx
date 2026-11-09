import { BarChart3, Download, Upload, type LucideIcon } from 'lucide-react'
import { AbreNaRolagem, Revelar } from '../../shared'

const passos: { icone: LucideIcon; titulo: string; texto: string }[] = [
  { icone: Download, titulo: 'Exporta', texto: 'No app do Inter: Extrato, escolhe o período e exporta em OFX ou CSV.' },
  { icone: Upload, titulo: 'Solta aqui', texto: 'O arquivo é lido na hora e esquecido logo depois.' },
  { icone: BarChart3, titulo: 'Confere', texto: 'Quanto entrou, quanto saiu, quanto sobrou. E onde foi parar o resto.' },
]

/** Título ao lado da frase e, embaixo, o bloco dos passos que abre conforme a página desce. */
export function ComoUsar() {
  return (
    <section id="como-usar" aria-labelledby="como-usar-titulo" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
      <Revelar className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <h2 id="como-usar-titulo" className="text-5xl leading-[0.95] font-bold tracking-[-0.03em] sm:text-6xl md:text-7xl">
          Como usar
        </h2>
        <p className="max-w-[40ch] text-lg leading-relaxed text-texto-suave">
          Três passos, um minuto. Sem cadastro, sem senha do banco e sem planilha.
        </p>
      </Revelar>
      <AbreNaRolagem className="bg-superficie">
        <ol className="grid gap-12 p-8 md:grid-cols-3 md:gap-8 md:p-12">
          {passos.map((passo, indice) => (
            <li key={passo.titulo} className="flex flex-col gap-4">
              <span className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-xl bg-primaria-suave text-primaria">
                  <passo.icone aria-hidden className="size-6" />
                </span>
                <span aria-hidden className="text-lg text-texto-suave tabular-nums">
                  {String(indice + 1).padStart(2, '0')}
                </span>
              </span>
              <h3 className="text-3xl font-bold tracking-[-0.02em]">{passo.titulo}</h3>
              <p className="leading-relaxed text-texto-suave">{passo.texto}</p>
            </li>
          ))}
        </ol>
      </AbreNaRolagem>
    </section>
  )
}

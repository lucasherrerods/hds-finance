import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useRef } from 'react'
import { passoDaRolagem } from './rolagem'

const passos = [
  { titulo: 'Exporta', texto: 'No app do Inter: Extrato, escolhe o período e exporta em OFX ou CSV.' },
  { titulo: 'Solta aqui', texto: 'O arquivo é lido na hora e esquecido logo depois. Não fica nada com a gente.' },
  { titulo: 'Confere', texto: 'Quanto entrou, quanto saiu, quanto sobrou. E onde foi parar o resto.' },
]

const TOTAL = passos.length
const numero = (indice: number) => String(indice + 1).padStart(2, '0')

/** Um passo por vez ocupa a tela: entra por baixo, segura e sai por cima. */
function Passo({ indice, progresso }: { indice: number; progresso: MotionValue<number> }) {
  const { titulo, texto } = passos[indice]
  const inicio = indice / TOTAL
  const fim = (indice + 1) / TOTAL
  const primeiro = indice === 0
  const ultimo = indice === TOTAL - 1
  const marcos = [inicio, inicio + 0.08, fim - 0.08, fim]
  const y = useTransform(progresso, marcos, [primeiro ? '0%' : '100%', '0%', '0%', ultimo ? '0%' : '-100%'])
  const opacity = useTransform(progresso, marcos, [primeiro ? 1 : 0, 1, 1, ultimo ? 1 : 0])

  return (
    <motion.li style={{ opacity }} className="absolute inset-x-6 inset-y-0 flex flex-col justify-center">
      <div className="overflow-hidden">
        <motion.h3
          style={{ y }}
          className="text-[clamp(3.5rem,14vw,11rem)] leading-[0.95] font-bold tracking-[-0.04em]"
        >
          {titulo}
        </motion.h3>
      </div>
      <p className="mt-6 max-w-[40ch] text-lg leading-relaxed text-texto-suave md:text-xl">{texto}</p>
    </motion.li>
  )
}

/** Os três passos presos na tela enquanto a página desce. */
export function ComoUsar() {
  const ref = useRef<HTMLElement>(null)
  const parado = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const contador = useTransform(scrollYProgress, (p) => numero(passoDaRolagem(p, TOTAL)))

  if (parado) {
    return (
      <section id="como-usar" aria-labelledby="como-usar-titulo" className="mx-auto max-w-6xl px-6 py-24">
        <h2 id="como-usar-titulo" className="mb-12 text-2xl text-texto-suave">
          Como usar
        </h2>
        <ol className="flex flex-col gap-12">
          {passos.map((passo) => (
            <li key={passo.titulo}>
              <h3 className="text-6xl font-bold tracking-[-0.03em]">{passo.titulo}</h3>
              <p className="mt-4 text-lg text-texto-suave">{passo.texto}</p>
            </li>
          ))}
        </ol>
      </section>
    )
  }

  return (
    <section ref={ref} id="como-usar" aria-labelledby="como-usar-titulo" className="relative h-[300svh]">
      <div className="sticky top-0 flex h-svh flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-4 px-6 pt-28">
          <h2 id="como-usar-titulo" className="text-2xl text-texto-suave">
            Como usar
          </h2>
          <p className="text-2xl text-texto-suave tabular-nums">
            <motion.span className="text-texto">{contador}</motion.span> / {numero(TOTAL - 1)}
          </p>
        </div>
        <ol className="relative mx-auto w-full max-w-6xl flex-1">
          {passos.map((passo, indice) => (
            <Passo key={passo.titulo} indice={indice} progresso={scrollYProgress} />
          ))}
        </ol>
        {/* A barra enche conforme os passos passam. */}
        <div className="mx-auto mb-12 h-1 w-[calc(100%-3rem)] max-w-6xl overflow-hidden rounded-full bg-borda">
          <motion.div className="h-full origin-left bg-primaria" style={{ scaleX: scrollYProgress }} />
        </div>
      </div>
    </section>
  )
}

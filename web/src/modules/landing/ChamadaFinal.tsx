import { ArrowRight } from 'lucide-react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef } from 'react'
import { Link } from 'react-router'

const LinkAnimado = motion.create(Link)

/** O convite final: um bloco que abre com a rolagem, e o próprio título é o botão. */
export function ChamadaFinal() {
  const ref = useRef<HTMLDivElement>(null)
  const parado = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const progresso = useSpring(scrollYProgress, { stiffness: 140, damping: 30 })
  const recuo = useTransform(progresso, [0, 1], [12, 0], { clamp: true })
  const clipPath = useTransform(recuo, (r) => `inset(${r}% ${r}% ${r}% ${r}% round 24px)`)
  const escala = useTransform(progresso, [0, 1], [0.9, 1], { clamp: true })

  return (
    <section className="px-6 py-24">
      <motion.div
        ref={ref}
        className="mx-auto max-w-6xl bg-primaria text-primaria-texto"
        style={parado ? { clipPath: 'inset(0 round 24px)' } : { clipPath, scale: escala }}
      >
        <div className="flex flex-col gap-12 px-8 py-16 md:px-12 md:py-20">
          <p className="max-w-[40ch] text-lg">
            O extrato já está no app do banco. Exportar leva um minuto, ler leva menos.
          </p>
          <LinkAnimado
            to="/testar"
            initial="parado"
            whileHover="mirando"
            className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between"
          >
            <h2 className="text-[clamp(3rem,11vw,8rem)] leading-[0.9] font-bold tracking-[-0.04em]">
              Ver o meu
              <br />
              mês
            </h2>
            <motion.span
              variants={{ parado: { x: 0, rotate: 0 }, mirando: { x: 12, rotate: -45 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primaria-texto text-primaria sm:mb-2 md:size-24"
            >
              <ArrowRight aria-hidden className="size-8 md:size-10" />
            </motion.span>
            <span className="sr-only">Testar com meu extrato</span>
          </LinkAnimado>
          <p className="border-t border-primaria-texto/30 pt-6">Grátis · sem cadastro · nada fica guardado</p>
        </div>
      </motion.div>
    </section>
  )
}

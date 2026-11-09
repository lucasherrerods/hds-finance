import { ArrowDownLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { Link } from 'react-router'
import { formatarMoedaComSinal } from '../../shared'
import { mesDeExemplo } from './exemplo'

const SUAVE = [0.22, 1, 0.36, 1] as const

export function Inicio() {
  const ref = useRef<HTMLElement>(null)
  const parado = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  // Ao descer, o texto sobe e some enquanto o cartão do mês chega mais perto.
  const textoY = useTransform(scrollYProgress, [0, 1], ['0%', '-30%'])
  const textoOpacidade = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const cartaoEscala = useTransform(scrollYProgress, [0, 1], [1, 1.12])
  const cartaoY = useTransform(scrollYProgress, [0, 1], ['0%', '12%'])

  return (
    <section ref={ref} id="inicio" className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-48 -z-10 mx-auto h-[32rem] max-w-4xl rounded-full bg-primaria-suave blur-3xl"
      />
      <div className="mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-6xl items-center gap-16 px-6 pt-16 pb-24 lg:grid-cols-12">
        <motion.div
          style={parado ? undefined : { y: textoY, opacity: textoOpacidade }}
          className="flex flex-col gap-6 lg:col-span-7"
        >
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: SUAVE }}
            className="text-5xl leading-[1.02] font-bold tracking-[-0.03em] sm:text-6xl lg:text-7xl"
          >
            Pra onde foi o seu dinheiro <span className="text-primaria">esse mês?</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="max-w-[48ch] text-lg leading-relaxed text-texto-suave"
          >
            Manda o extrato do Inter e descobre. Sem cadastro, sem senha do banco e sem montar planilha.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="flex flex-wrap gap-4"
          >
            <Link
              to="/testar"
              className="group flex items-center gap-2 rounded-lg bg-primaria px-6 py-3 font-medium text-primaria-texto transition-transform hover:-translate-y-0.5"
            >
              Testar com meu extrato
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#exemplo"
              className="rounded-lg px-6 py-3 font-medium text-texto-suave transition-colors hover:text-texto"
            >
              Ver um mês de mentira
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          aria-hidden
          className="lg:col-span-5"
          initial={{ opacity: 0, y: 40, rotate: -3 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: SUAVE }}
        >
          <motion.div
            style={parado ? undefined : { scale: cartaoEscala, y: cartaoY }}
            className="flex flex-col gap-2 rounded-3xl bg-superficie p-8 shadow-elevacao-alta"
          >
            <span className="text-texto-suave">Outubro de 2026</span>
            <span className="text-4xl font-bold tracking-tight tabular-nums">
              {formatarMoedaComSinal(mesDeExemplo.resultado, 'entrada')}
            </span>
            <span className="mb-2 text-texto-suave">sobraram no fim do mês</span>
            <div className="flex flex-col gap-2 rounded-2xl bg-fundo p-4">
              <Linha icone={<ArrowDownLeft className="size-4 opacity-70" />} rotulo="Entrou" cor="text-entrada">
                {formatarMoedaComSinal(mesDeExemplo.entradas, 'entrada')}
              </Linha>
              <Linha icone={<ArrowUpRight className="size-4 opacity-70" />} rotulo="Saiu" cor="text-saida">
                {formatarMoedaComSinal(mesDeExemplo.saidas, 'saida')}
              </Linha>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

type LinhaProps = { icone: React.ReactNode; rotulo: string; cor: string; children: string }

function Linha({ icone, rotulo, cor, children }: LinhaProps) {
  return (
    <span className="flex items-center justify-between gap-4 tabular-nums">
      <span className="flex items-center gap-2 text-texto-suave">
        {icone} {rotulo}
      </span>
      <span className={`font-semibold ${cor}`}>{children}</span>
    </span>
  )
}

import { ArrowDownLeft, ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router'
import { formatarMoedaComSinal } from '../../shared'
import { mesDeExemplo } from './exemplo'

const entrada = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }

export function Inicio() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-48 mx-auto h-[32rem] max-w-4xl rounded-full bg-primaria-suave blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 pt-16 pb-24 md:pt-24 lg:grid-cols-12">
        <motion.div
          className="flex flex-col gap-6 lg:col-span-7"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.12 }}
        >
          <motion.p variants={entrada} className="flex items-center gap-2 font-medium text-texto-suave">
            <ShieldCheck aria-hidden className="size-4 opacity-70" />
            Nada do seu extrato fica guardado
          </motion.p>
          <motion.h1
            variants={entrada}
            className="text-4xl leading-[1.1] font-bold tracking-[-0.02em] sm:text-5xl lg:text-6xl"
          >
            O fechamento do seu mês, direto do extrato do Inter.
          </motion.h1>
          <motion.p variants={entrada} className="max-w-[60ch] text-lg text-texto-suave">
            Envie o arquivo .ofx ou .csv que o próprio banco exporta e veja entradas, saídas e o resultado de cada mês,
            sem cadastro e sem conectar sua conta.
          </motion.p>
          <motion.div variants={entrada} className="flex flex-wrap gap-4">
            <Link
              to="/testar"
              className="group flex items-center gap-2 rounded-lg bg-primaria px-6 py-3 font-medium text-primaria-texto transition-transform hover:-translate-y-0.5"
            >
              Testar com meu extrato
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#exemplo"
              className="rounded-lg bg-superficie px-6 py-3 font-medium shadow-elevacao transition-transform hover:-translate-y-0.5"
            >
              Ver um exemplo
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          aria-hidden
          className="lg:col-span-5"
          initial={{ opacity: 0, scale: 0.94, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="flex flex-col gap-4 rounded-3xl bg-superficie p-8 shadow-elevacao-alta"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-texto-suave">Outubro de 2026</span>
            <span className="text-4xl font-bold tracking-tight tabular-nums">
              {formatarMoedaComSinal(mesDeExemplo.resultado, 'entrada')}
            </span>
            <div className="flex flex-col gap-2 rounded-2xl bg-fundo p-4">
              <Linha icone={<ArrowDownLeft className="size-4 opacity-70" />} rotulo="Entradas" cor="text-entrada">
                {formatarMoedaComSinal(mesDeExemplo.entradas, 'entrada')}
              </Linha>
              <Linha icone={<ArrowUpRight className="size-4 opacity-70" />} rotulo="Saídas" cor="text-saida">
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

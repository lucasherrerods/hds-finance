import { motion } from 'motion/react'
import { Revelar } from '../../shared'

const garantias = [
  {
    titulo: 'Não guarda nada',
    texto: 'O extrato é lido em memória e some quando o resumo chega. Nada de banco, cache ou arquivo temporário.',
  },
  {
    titulo: 'Não anota nada',
    texto: 'Os logs do servidor nunca levam valor, descrição de transação ou trecho do arquivo.',
  },
  {
    titulo: 'Não pede senha',
    texto: 'Você manda o arquivo que o próprio Inter te dá. Login e senha do banco ficam com você.',
  },
]

/** Uma garantia por linha, que acende quando o mouse passa. */
export function Privacidade() {
  return (
    <section id="privacidade" aria-labelledby="privacidade-titulo" className="mx-auto max-w-6xl px-6 py-24">
      <Revelar className="mb-12 flex max-w-[60ch] flex-col gap-4">
        <h2 id="privacidade-titulo" className="text-4xl leading-[1.05] font-bold tracking-[-0.03em] sm:text-5xl">
          Privacidade, na prática
        </h2>
        <p className="text-lg text-texto-suave">Três coisas que o hds-finance nunca faz com o seu extrato.</p>
      </Revelar>
      <ol className="border-t border-borda">
        {garantias.map((garantia, indice) => (
          <motion.li
            key={garantia.titulo}
            initial="fora"
            whileInView="dentro"
            whileHover="acesa"
            viewport={{ once: true, margin: '-64px' }}
            variants={{ fora: { opacity: 0, x: -24 }, dentro: { opacity: 1, x: 0 } }}
            transition={{ duration: 0.5, delay: indice * 0.08 }}
            className="relative isolate grid grid-cols-[2.5rem_1fr] items-baseline gap-x-4 gap-y-2 overflow-hidden border-b border-borda py-8 md:grid-cols-[4rem_1fr_1fr] md:gap-x-6"
          >
            <motion.span
              aria-hidden
              className="absolute inset-0 -z-10 origin-left bg-primaria-suave"
              variants={{ fora: { scaleX: 0 }, dentro: { scaleX: 0 }, acesa: { scaleX: 1 } }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
            <span className="pl-2 text-lg text-primaria tabular-nums">{String(indice + 1).padStart(2, '0')}</span>
            <motion.h3
              className="text-3xl leading-none font-bold tracking-[-0.02em] md:text-4xl"
              variants={{ acesa: { x: 12 } }}
            >
              {garantia.titulo}
            </motion.h3>
            <p className="col-start-2 pr-2 leading-relaxed text-texto-suave md:col-start-3">{garantia.texto}</p>
          </motion.li>
        ))}
      </ol>
    </section>
  )
}

import { motion } from 'motion/react'
import { Revelar } from '../../shared'

const garantias = [
  {
    titulo: 'Lido e esquecido',
    texto: 'O extrato passa pela memória do servidor e some quando o resumo chega. Banco de dados, cache e arquivo temporário ficam de fora.',
  },
  {
    titulo: 'Logs limpos',
    texto: 'O servidor registra só que houve um envio. Valores, descrições e trechos do arquivo nunca entram.',
  },
  {
    titulo: 'Sua senha é sua',
    texto: 'Você manda o arquivo que o próprio Inter te dá. Login e senha do banco ficam com você.',
  },
]

/** Cada número cai no tempo, um depois do outro, e o texto vem logo atrás. */
export function Privacidade() {
  return (
    <section id="privacidade" aria-labelledby="privacidade-titulo" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
      <Revelar className="mb-12 flex max-w-[60ch] flex-col gap-4">
        <h2 id="privacidade-titulo" className="text-5xl leading-[0.95] font-bold tracking-[-0.03em] sm:text-6xl md:text-7xl">
          Privacidade, na prática
        </h2>
        <p className="text-lg text-texto-suave">Três promessas sobre o seu extrato.</p>
      </Revelar>
      <ol className="grid gap-12 overflow-hidden md:grid-cols-3 md:gap-8">
        {garantias.map((garantia, indice) => (
          <li key={garantia.titulo}>
            <motion.span
              aria-hidden
              className="block origin-bottom-left text-[7rem] leading-[0.8] font-bold tracking-[-0.05em] text-primaria tabular-nums md:text-[9rem]"
              initial={{ opacity: 0, scale: 1.3 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-120px' }}
              transition={{ delay: indice * 0.45, type: 'spring', stiffness: 500, damping: 18 }}
            >
              {indice + 1}
            </motion.span>
            <Revelar atraso={indice * 0.45 + 0.1}>
              <h3 className="mt-6 mb-2 text-3xl leading-none font-bold tracking-[-0.02em]">{garantia.titulo}</h3>
              <p className="max-w-[36ch] leading-relaxed text-texto-suave">{garantia.texto}</p>
            </Revelar>
          </li>
        ))}
      </ol>
    </section>
  )
}

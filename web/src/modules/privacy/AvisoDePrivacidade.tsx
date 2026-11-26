import { ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Dialogo } from '../../shared'
import { pontos } from './pontos'

const ligacao = 'font-medium text-primaria underline underline-offset-4'

export function AvisoDePrivacidade() {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="flex items-start gap-2 text-texto-suave">
        <ShieldCheck aria-hidden className="mt-1 size-4 shrink-0 opacity-70" />
        Nada é armazenado. O arquivo é lido em memória e some assim que o resumo aparece.
      </p>
      <button type="button" onClick={() => setAberto(true)} className={ligacao}>
        Como seus dados são tratados
      </button>
      {aberto && (
        <Dialogo
          rotulo="Como seus dados são tratados"
          aoFechar={() => setAberto(false)}
          className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl rounded-2xl border"
          cabecalho={<h2 className="text-2xl leading-tight font-bold tracking-[-0.02em]">Seus dados, do começo ao fim</h2>}
        >
          <dl className="flex flex-col gap-4">
            {pontos.map((p, i) => (
              <motion.div
                key={p.titulo}
                className="flex flex-col gap-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              >
                <dt className="font-semibold">{p.titulo}</dt>
                <dd className="text-texto-suave">{p.texto}</dd>
              </motion.div>
            ))}
          </dl>
          <Link to="/privacidade" className={ligacao}>
            Ler a política completa
          </Link>
        </Dialogo>
      )}
    </div>
  )
}

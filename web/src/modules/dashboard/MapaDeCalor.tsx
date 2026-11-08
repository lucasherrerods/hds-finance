import { motion } from 'motion/react'
import { formatarMoeda } from '../../shared'
import type { Painel } from '../import'
import { Cartao } from './Cartao'
import { nivelDeCalor } from './painel'

const diasDaSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const nomesDosDias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

const fundoDoNivel = ['bg-fundo', 'bg-calor-1', 'bg-calor-2', 'bg-calor-3', 'bg-calor-4']
const textoDoNivel = ['text-texto-suave', 'text-texto', 'text-texto', 'text-primaria-texto', 'text-primaria-texto']

type Props = { painel: Painel }

export function MapaDeCalor({ painel }: Props) {
  const maximo = Math.max(0, ...painel.mapaDeCalor.map((d) => d.valor))
  const semanas = Math.max(1, ...painel.mapaDeCalor.map((d) => d.semana + 1))

  return (
    <Cartao titulo="Mapa de calor" className="h-full">
      <div className="flex flex-col gap-1">
        <span className="text-3xl font-bold tracking-tight tabular-nums">{formatarMoeda(painel.gastoNoMes)}</span>
        <span className="text-texto-suave">
          Média diária: <span className="font-semibold text-texto tabular-nums">{formatarMoeda(painel.mediaDiaria)}</span>
        </span>
      </div>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `1.5rem repeat(${semanas}, minmax(0, 1fr))`, gridTemplateRows: 'repeat(7, 1.75rem)' }}
      >
        {diasDaSemana.map((letra, linha) => (
          <span
            key={linha}
            aria-hidden
            title={nomesDosDias[linha]}
            className="flex items-center text-xs text-texto-suave"
            style={{ gridColumn: 1, gridRow: linha + 1 }}
          >
            {letra}
          </span>
        ))}
        {painel.mapaDeCalor.map((dia) => {
          const nivel = nivelDeCalor(dia.valor, maximo)
          return (
            <motion.span
              key={dia.dia}
              aria-label={`Dia ${dia.dia}: ${dia.valor > 0 ? formatarMoeda(dia.valor) : 'sem gastos'}`}
              title={`Dia ${dia.dia}: ${formatarMoeda(dia.valor)}`}
              className={`flex items-center justify-center rounded-md text-xs tabular-nums ${fundoDoNivel[nivel]} ${textoDoNivel[nivel]}`}
              style={{ gridColumn: dia.semana + 2, gridRow: dia.diaDaSemana + 1 }}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: dia.dia * 0.015 }}
            >
              {dia.dia}
            </motion.span>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-4 text-sm text-texto-suave">
        <span>Menos</span>
        <span aria-hidden className="flex gap-1">
          {fundoDoNivel.map((fundo) => (
            <span key={fundo} className={`size-3 rounded-sm ${fundo}`} />
          ))}
        </span>
        <span>Mais</span>
      </div>

      {painel.maiorGasto && (
        <div className="flex items-baseline justify-between gap-4 border-t border-borda pt-4">
          <span className="text-texto-suave">Maior gasto</span>
          <span className="tabular-nums">
            <span className="font-semibold text-saida">−{formatarMoeda(painel.maiorGasto.valor)}</span>
            <span className="ml-2 text-sm text-texto-suave">dia {painel.maiorGasto.dia}</span>
          </span>
        </div>
      )}
    </Cartao>
  )
}

import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatarMoeda, formatarMoedaCompacta } from '../../shared'
import type { PontoDoRitmo } from '../import'
import { eixoDosGraficos } from './estiloDosGraficos'
import { CaixaDaDica, TabelaAcessivel, type PropsDaDica } from './partesDosGraficos'

type Props = { ritmo: PontoDoRitmo[] }

/** Só o gráfico; o cabeçalho com a comparação fica em `PainelDoMes`, fora do pedaço carregado sob demanda. */
export function RitmoDeGastos({ ritmo }: Props) {
  const temAnterior = ritmo.some((p) => p.acumuladoAnterior !== null)
  const ultimoDia = ritmo.filter((p) => p.acumuladoAtual !== null).at(-1)

  return (
    <>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={ritmo} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="ritmo-preenchimento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-saida)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-saida)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-borda)" strokeDasharray="2 6" />
          <XAxis dataKey="dia" ticks={[1, 15, 25, ritmo.length]} {...eixoDosGraficos} />
          <YAxis tickFormatter={formatarMoedaCompacta} width={72} {...eixoDosGraficos} />
          <Tooltip content={(props) => <Dica {...props} />} cursor={{ stroke: 'var(--color-borda)' }} />
          <Legend formatter={(nome: string) => <span className="text-texto-suave">{nome}</span>} />
          {temAnterior && (
            <Line
              type="monotone"
              dataKey="acumuladoAnterior"
              name="Mês anterior"
              stroke="var(--color-texto-suave)"
              strokeDasharray="6 4"
              strokeWidth={2}
              dot={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="acumuladoAtual"
            name="Este mês"
            stroke="var(--color-saida)"
            fill="url(#ritmo-preenchimento)"
            strokeWidth={2.5}
            animationDuration={1200}
            connectNulls={false}
            dot={(props: { cx?: number; cy?: number; payload?: PontoDoRitmo }) =>
              props.payload?.dia === ultimoDia?.dia ? (
                <circle key="ultimo" cx={props.cx} cy={props.cy} r={5} fill="var(--color-saida)" stroke="var(--color-superficie)" strokeWidth={3} />
              ) : (
                <g key={props.payload?.dia} />
              )
            }
          />
        </ComposedChart>
      </ResponsiveContainer>
      <TabelaAcessivel
        titulo="Gasto acumulado por dia"
        colunas={['Dia', 'Este mês', 'Mês anterior']}
        linhas={ritmo.map((p) => [
          String(p.dia),
          p.acumuladoAtual === null ? '—' : formatarMoeda(p.acumuladoAtual),
          p.acumuladoAnterior === null ? '—' : formatarMoeda(p.acumuladoAnterior),
        ])}
      />
    </>
  )
}

function Dica({ active, payload, label }: PropsDaDica) {
  if (!active || !payload?.length) return null
  return (
    <CaixaDaDica titulo={`Dia ${label}`}>
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => (
          <span key={String(p.name)}>
            {String(p.name)}: {formatarMoeda(Number(p.value))}
          </span>
        ))}
    </CaixaDaDica>
  )
}

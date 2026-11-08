import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatarMoeda } from '../../shared'
import type { PontoDoRitmo } from '../import'
import { eixoDosGraficos, valorCompacto } from './estiloDosGraficos'
import { CaixaDaDica, TabelaAcessivel, type PropsDaDica } from './partesDosGraficos'

type Props = { ritmo: PontoDoRitmo[] }

/** Só o gráfico; o cabeçalho com a comparação fica em `PainelDoMes`, fora do pedaço carregado sob demanda. */
export function RitmoDeGastos({ ritmo }: Props) {
  const temAnterior = ritmo.some((p) => p.acumuladoAnterior !== null)
  const ultimoDia = ritmo.filter((p) => p.acumuladoAtual !== null).at(-1)

  return (
    <>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={ritmo} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-borda)" />
          <XAxis dataKey="dia" ticks={[1, 15, 25, ritmo.length]} {...eixoDosGraficos} />
          <YAxis tickFormatter={valorCompacto} width={72} {...eixoDosGraficos} />
          <Tooltip content={(props) => <Dica {...props} />} cursor={{ stroke: 'var(--color-borda)' }} />
          <Legend formatter={(nome: string) => <span className="text-texto-suave">{nome}</span>} />
          {temAnterior && (
            <Line
              type="stepAfter"
              dataKey="acumuladoAnterior"
              name="Mês anterior"
              stroke="var(--color-texto-suave)"
              strokeDasharray="6 4"
              strokeWidth={2}
              dot={false}
            />
          )}
          <Line
            type="stepAfter"
            dataKey="acumuladoAtual"
            name="Este mês"
            stroke="var(--color-saida)"
            strokeWidth={2.5}
            connectNulls={false}
            dot={(props: { cx?: number; cy?: number; payload?: PontoDoRitmo }) =>
              props.payload?.dia === ultimoDia?.dia ? (
                <circle key="ultimo" cx={props.cx} cy={props.cy} r={5} fill="var(--color-saida)" />
              ) : (
                <g key={props.payload?.dia} />
              )
            }
          />
        </LineChart>
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

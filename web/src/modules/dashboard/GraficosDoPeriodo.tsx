import { useId, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatarMoeda, formatarMoedaComSinal, Revelar } from '../../shared'
import type { ResumoMensal } from '../import'
import { dadosDeEntradasESaidas, dadosDoSaldo } from './dadosDosGraficos'

type Props = { meses: ResumoMensal[] }

const compacto = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' })

const eixo = {
  stroke: 'var(--color-texto-suave)',
  tick: { fill: 'var(--color-texto-suave)', fontSize: 14 },
  tickLine: false,
  axisLine: false,
}

export function GraficosDoPeriodo({ meses }: Props) {
  if (meses.length < 2) return null

  const fluxo = dadosDeEntradasESaidas(meses)
  const saldo = dadosDoSaldo(meses)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Cartao titulo="Entradas x saídas">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={fluxo} barGap={4} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-borda)" />
            <XAxis dataKey="rotulo" {...eixo} />
            <YAxis tickFormatter={(v: number) => compacto.format(v)} width={72} {...eixo} />
            <Tooltip content={(props) => <DicaDeFluxo {...props} />} cursor={{ fill: 'var(--color-fundo)' }} />
            <Legend formatter={(nome: string) => <span className="text-texto-suave">{nome}</span>} />
            <Bar dataKey="entradas" name="Entradas (+)" fill="var(--color-entrada)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas (−)" fill="var(--color-saida)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <TabelaAcessivel
          titulo="Entradas e saídas por mês"
          colunas={['Mês', 'Entradas', 'Saídas']}
          linhas={fluxo.map((p) => [
            p.rotulo,
            formatarMoedaComSinal(p.entradas, 'entrada'),
            formatarMoedaComSinal(p.saidas, 'saida'),
          ])}
        />
      </Cartao>

      {saldo.length > 0 && (
        <Cartao titulo="Evolução do saldo">
          <GraficoDeSaldo dados={saldo} />
          <TabelaAcessivel
            titulo="Saldo no fim de cada mês"
            colunas={['Mês', 'Saldo']}
            linhas={saldo.map((p) => [p.rotulo, formatarMoeda(p.saldo)])}
          />
        </Cartao>
      )}
    </div>
  )
}

function GraficoDeSaldo({ dados }: { dados: ReturnType<typeof dadosDoSaldo> }) {
  // Cada gráfico precisa de um id próprio para o gradiente, já que pode haver mais de um na página.
  const idDoGradiente = `saldo-${useId().replace(/:/g, '')}`

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={idDoGradiente} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-grafico-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-grafico-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-borda)" />
        <XAxis dataKey="rotulo" {...eixo} />
        <YAxis tickFormatter={(v: number) => compacto.format(v)} width={72} {...eixo} />
        <Tooltip content={(props) => <DicaDeSaldo {...props} />} cursor={{ stroke: 'var(--color-borda)' }} />
        <Area
          type="monotone"
          dataKey="saldo"
          name="Saldo"
          stroke="var(--color-grafico-1)"
          strokeWidth={2}
          fill={`url(#${idDoGradiente})`}
          dot={{ r: 3, fill: 'var(--color-grafico-1)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Revelar className="flex flex-col gap-4 rounded-2xl bg-superficie p-6 shadow-elevacao">
      <h3 className="text-xl font-semibold tracking-tight">{titulo}</h3>
      {children}
    </Revelar>
  )
}

function Dica({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-superficie px-4 py-2 shadow-elevacao-alta tabular-nums">
      <span className="font-semibold">{titulo}</span>
      {children}
    </div>
  )
}

type PropsDaDica = { active?: boolean; payload?: ReadonlyArray<{ value?: unknown }>; label?: ReactNode }

function DicaDeFluxo({ active, payload, label }: PropsDaDica) {
  if (!active || !payload?.length) return null
  const [entradas, saidas] = payload.map((p) => Number(p.value))
  return (
    <Dica titulo={label}>
      <span className="text-entrada">Entradas {formatarMoedaComSinal(entradas, 'entrada')}</span>
      <span className="text-saida">Saídas {formatarMoedaComSinal(saidas, 'saida')}</span>
    </Dica>
  )
}

function DicaDeSaldo({ active, payload, label }: PropsDaDica) {
  if (!active || !payload?.length) return null
  return (
    <Dica titulo={label}>
      <span>Saldo {formatarMoeda(Number(payload[0].value))}</span>
    </Dica>
  )
}

type TabelaProps = { titulo: string; colunas: string[]; linhas: string[][] }

/** Os mesmos números do gráfico, para leitores de tela. */
function TabelaAcessivel({ titulo, colunas, linhas }: TabelaProps) {
  const id = useId()
  return (
    <table aria-labelledby={id} className="sr-only">
      <caption id={id}>{titulo}</caption>
      <thead>
        <tr>
          {colunas.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <tr key={linha[0]}>
            {linha.map((celula, i) => (
              <td key={i}>{celula}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

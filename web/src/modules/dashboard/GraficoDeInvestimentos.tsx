import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatarMoeda, formatarMoedaCompacta } from '../../shared'
import type { ResumoMensal } from '../import'
import { Cartao } from './Cartao'
import { eixoDosGraficos } from './estiloDosGraficos'
import { dadosDosInvestimentos } from './investimentos'
import { CaixaDaDica, TabelaAcessivel, type PropsDaDica } from './partesDosGraficos'

/** Barras do que foi aplicado e resgatado no mês e a linha do aplicado líquido acumulado. */
export function GraficoDeInvestimentos({ meses }: { meses: ResumoMensal[] }) {
  const dados = dadosDosInvestimentos(meses)
  return (
    <Cartao titulo="Aplicado x resgatado por mês">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={dados} barGap={4} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-borda)" />
          <XAxis dataKey="rotulo" {...eixoDosGraficos} />
          <YAxis tickFormatter={formatarMoedaCompacta} width={72} {...eixoDosGraficos} />
          <Tooltip content={(props) => <Dica {...props} />} cursor={{ fill: 'var(--color-fundo)' }} />
          <Legend formatter={(nome: string) => <span className="text-texto-suave">{nome}</span>} />
          <Bar dataKey="aplicado" name="Aplicado" fill="var(--color-grafico-1)" radius={[8, 8, 2, 2]} maxBarSize={28} />
          <Bar dataKey="resgatado" name="Resgatado" fill="var(--color-grafico-3)" radius={[8, 8, 2, 2]} maxBarSize={28} />
          <Line
            dataKey="acumulado"
            name="Aplicado líquido acumulado"
            type="monotone"
            stroke="var(--color-grafico-2)"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <TabelaAcessivel
        titulo="Investimentos por mês"
        colunas={['Mês', 'Aplicado', 'Resgatado', 'Acumulado']}
        linhas={dados.map((p) => [p.rotulo, formatarMoeda(p.aplicado), formatarMoeda(p.resgatado), formatarMoeda(p.acumulado)])}
      />
    </Cartao>
  )
}

function Dica({ active, payload, label }: PropsDaDica) {
  if (!active || !payload?.length) return null
  return (
    <CaixaDaDica titulo={label}>
      {payload.map((p) => (
        <span key={String(p.name)} className="text-texto-suave">
          {String(p.name)} <span className="text-texto">{formatarMoeda(Number(p.value))}</span>
        </span>
      ))}
    </CaixaDaDica>
  )
}

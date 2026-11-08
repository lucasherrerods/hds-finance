import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatarMoedaComSinal } from '../../shared'
import type { ResumoMensal } from '../import'
import { Cartao } from './Cartao'
import { dadosDeEntradasESaidas } from './dadosDosGraficos'
import { eixoDosGraficos, valorCompacto } from './estiloDosGraficos'
import { CaixaDaDica, TabelaAcessivel, type PropsDaDica } from './partesDosGraficos'

type Props = { meses: ResumoMensal[] }

export function GraficosDoPeriodo({ meses }: Props) {
  if (meses.length < 2) return null

  const fluxo = dadosDeEntradasESaidas(meses)

  return (
    <Cartao titulo="Entradas x saídas por mês">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={fluxo} barGap={4} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-borda)" />
          <XAxis dataKey="rotulo" {...eixoDosGraficos} />
          <YAxis tickFormatter={valorCompacto} width={72} {...eixoDosGraficos} />
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
  )
}

function DicaDeFluxo({ active, payload, label }: PropsDaDica) {
  if (!active || !payload?.length) return null
  const [entradas, saidas] = payload.map((p) => Number(p.value))
  return (
    <CaixaDaDica titulo={label}>
      <span className="text-entrada">Entradas {formatarMoedaComSinal(entradas, 'entrada')}</span>
      <span className="text-saida">Saídas {formatarMoedaComSinal(saidas, 'saida')}</span>
    </CaixaDaDica>
  )
}

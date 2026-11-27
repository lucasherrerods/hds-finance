import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatarMoeda, formatarMoedaCompacta } from '../../shared'
import type { ResumoMensal } from '../import'
import { Cartao } from './Cartao'
import { eixoDosGraficos } from './estiloDosGraficos'
import { dadosDaMeta, META_MENSAL, type PontoDaMeta } from './investimentos'
import { CaixaDaDica, TabelaAcessivel, type PropsDaDica } from './partesDosGraficos'

/** Aplicado líquido de cada mês contra a meta. Bateu ou não aparece na cor, na dica e na tabela. */
export function GraficoDaMeta({ meses }: { meses: ResumoMensal[] }) {
  const dados = dadosDaMeta(meses)
  const batidos = dados.filter((p) => p.bateu).length
  return (
    <Cartao titulo={`Meta de ${formatarMoeda(META_MENSAL)} por mês`}>
      <p className="text-texto-suave">
        Bateu a meta em <span className="font-semibold text-texto">{batidos}</span> de {dados.length} meses.
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-borda)" />
          <XAxis dataKey="rotulo" {...eixoDosGraficos} />
          <YAxis tickFormatter={formatarMoedaCompacta} width={72} {...eixoDosGraficos} />
          <Tooltip content={(props) => <Dica {...props} />} cursor={{ fill: 'var(--color-fundo)' }} />
          <ReferenceLine
            y={META_MENSAL}
            stroke="var(--color-texto-suave)"
            strokeDasharray="6 4"
            label={{ value: 'Meta', position: 'insideTopRight', fill: 'var(--color-texto-suave)', fontSize: 12 }}
          />
          <Bar dataKey="liquido" name="Aplicado líquido" radius={[8, 8, 2, 2]} maxBarSize={32}>
            {dados.map((p) => (
              <Cell key={p.rotulo} fill={p.bateu ? 'var(--color-grafico-1)' : 'var(--color-grafico-3)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <TabelaAcessivel
        titulo="Meta de aplicação por mês"
        colunas={['Mês', 'Aplicado líquido', 'Parte da renda', 'Meta']}
        linhas={dados.map((p) => [p.rotulo, formatarMoeda(p.liquido), taxaDe(p), p.bateu ? 'Bateu' : 'Não bateu'])}
      />
    </Cartao>
  )
}

const taxaDe = (p: PontoDaMeta) => (p.taxa === null ? '—' : `${p.taxa.toLocaleString('pt-BR')}%`)

function Dica({ active, payload, label }: PropsDaDica) {
  const ponto = (payload?.[0] as { payload?: PontoDaMeta } | undefined)?.payload
  if (!active || !ponto) return null
  return (
    <CaixaDaDica titulo={label}>
      <span className="text-texto-suave">
        Aplicado líquido <span className="text-texto">{formatarMoeda(ponto.liquido)}</span>
      </span>
      <span className="text-texto-suave">
        Parte da renda <span className="text-texto">{taxaDe(ponto)}</span>
      </span>
      <span className="text-texto">{ponto.bateu ? '✓ Bateu a meta' : 'Abaixo da meta'}</span>
    </CaixaDaDica>
  )
}

import { Info } from 'lucide-react'
import { Revelar } from '../../shared'
import { GraficosDoPeriodo, PainelDoMes, ResumoDoMes } from '../dashboard'
import { mesDeExemplo, mesesDeExemplo, painelDeExemplo } from './exemplo'
import { Secao } from './Secao'

export function ExemploDeResultado() {
  return (
    <Secao
      id="exemplo"
      titulo="Exemplo de resultado"
      descricao="É isto que aparece depois de enviar o extrato: o painel do mês, a evolução do período e o fechamento."
    >
      <div className="flex flex-col gap-6">
        <Revelar>
          <p className="flex items-center gap-2 text-texto-suave">
            <Info aria-hidden className="size-4 opacity-70" />
            Dados fictícios, só para ilustrar.
          </p>
        </Revelar>
        <PainelDoMes painel={painelDeExemplo} />
        <Revelar>
          <GraficosDoPeriodo meses={mesesDeExemplo} />
        </Revelar>
        <Revelar>
          <ResumoDoMes mes={mesDeExemplo} />
        </Revelar>
      </div>
    </Secao>
  )
}

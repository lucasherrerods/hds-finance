import { Info } from 'lucide-react'
import { Revelar } from '../../shared'
import { GraficosDoPeriodo, MesesPorAbas, PainelDoMes } from '../dashboard'
import { mesesDeExemplo, painelDeExemplo, transacoesDeExemplo } from './exemplo'
import { Secao } from './Secao'

export function ExemploDeResultado() {
  return (
    <Secao
      id="exemplo"
      titulo="Um mês de mentira"
      descricao="Antes de mandar o seu, veja como fica. É exatamente esta tela que aparece depois do envio."
    >
      <div className="flex flex-col gap-6">
        <Revelar>
          <p className="flex items-center gap-2 text-texto-suave">
            <Info aria-hidden className="size-4 opacity-70" />
            Dados fictícios. Ninguém gastou isso tudo em comida de verdade.
          </p>
        </Revelar>
        <PainelDoMes painel={painelDeExemplo} />
        <Revelar>
          <GraficosDoPeriodo meses={mesesDeExemplo} />
        </Revelar>
        <Revelar>
          <MesesPorAbas meses={mesesDeExemplo} transacoes={transacoesDeExemplo} />
        </Revelar>
      </div>
    </Secao>
  )
}

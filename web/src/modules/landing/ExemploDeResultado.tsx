import { Info } from 'lucide-react'
import { Revelar } from '../../shared'
import { PainelDoMes } from '../dashboard'
import { painelDeExemplo } from './exemplo'
import { Secao } from './Secao'

// Só o painel: as transações, os gráficos do período e o mês a mês ficam para quem enviar o próprio extrato.
const painelResumido = { ...painelDeExemplo, transacoesRecentes: [] }

export function ExemploDeResultado() {
  return (
    <Secao
      id="exemplo"
      titulo="Um mês de mentira"
      descricao="O começo do que aparece depois do envio. Com o seu extrato vêm também a evolução dos meses e cada transação."
    >
      <div className="flex flex-col gap-6">
        <Revelar>
          <p className="flex items-center gap-2 text-texto-suave">
            <Info aria-hidden className="size-4 opacity-70" />
            Dados fictícios. Ninguém gastou isso tudo em comida de verdade.
          </p>
        </Revelar>
        <PainelDoMes painel={painelResumido} />
      </div>
    </Secao>
  )
}

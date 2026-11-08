import { Info } from 'lucide-react'
import { Revelar } from '../../shared'
import { ResumoDoMes } from '../dashboard'
import { mesDeExemplo } from './exemplo'
import { Secao } from './Secao'

export function ExemploDeResultado() {
  return (
    <Secao
      id="exemplo"
      titulo="Exemplo de resultado"
      descricao="É isto que aparece depois de enviar o extrato: um resumo por mês, pronto para conferir."
    >
      <Revelar className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-texto-suave">
          <Info aria-hidden className="size-4 opacity-70" />
          Dados fictícios, só para ilustrar.
        </p>
        <ResumoDoMes mes={mesDeExemplo} />
      </Revelar>
    </Secao>
  )
}

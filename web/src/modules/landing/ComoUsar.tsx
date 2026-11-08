import { BarChart3, Download, Upload, type LucideIcon } from 'lucide-react'
import { Revelar } from '../../shared'
import { Secao } from './Secao'

const passos: { icone: LucideIcon; titulo: string; texto: string }[] = [
  {
    icone: Download,
    titulo: 'Exporte o extrato',
    texto: 'No app ou no site do Inter, abra o extrato da conta, escolha o período e exporte em OFX ou CSV.',
  },
  {
    icone: Upload,
    titulo: 'Envie o arquivo aqui',
    texto: 'O arquivo é lido em memória, aplicações e transferências são separadas e as duplicadas são ignoradas.',
  },
  {
    icone: BarChart3,
    titulo: 'Veja o fechamento',
    texto: 'Entradas, saídas e o resultado de cada mês, prontos para conferir.',
  },
]

export function ComoUsar() {
  return (
    <Secao id="como-usar" titulo="Como usar" descricao="Três passos, sem cadastro e sem senha do banco.">
      <ol className="grid gap-6 md:grid-cols-3">
        {passos.map((passo, indice) => (
          <li key={passo.titulo}>
            <Revelar atraso={indice * 0.1} className="h-full">
              <div className="flex h-full flex-col gap-4 rounded-2xl bg-superficie p-6 shadow-elevacao transition-transform duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-primaria-suave text-primaria">
                    <passo.icone aria-hidden className="size-6" />
                  </span>
                  <span aria-hidden className="text-4xl font-bold text-texto-suave/30 tabular-nums">
                    {indice + 1}
                  </span>
                </div>
                <h3 className="text-xl font-semibold tracking-tight">{passo.titulo}</h3>
                <p className="text-texto-suave">{passo.texto}</p>
              </div>
            </Revelar>
          </li>
        ))}
      </ol>
    </Secao>
  )
}

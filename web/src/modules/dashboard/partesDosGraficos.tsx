import { useId, type ReactNode } from 'react'

export type PropsDaDica = {
  active?: boolean
  payload?: ReadonlyArray<{ name?: unknown; value?: unknown }>
  label?: ReactNode
}

export function CaixaDaDica({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-superficie px-4 py-2 shadow-elevacao-alta tabular-nums">
      <span className="font-semibold">{titulo}</span>
      {children}
    </div>
  )
}

type TabelaProps = { titulo: string; colunas: string[]; linhas: string[][] }

/** Os mesmos números do gráfico, para leitores de tela. */
export function TabelaAcessivel({ titulo, colunas, linhas }: TabelaProps) {
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

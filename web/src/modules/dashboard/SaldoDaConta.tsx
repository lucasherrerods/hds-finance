import { formatarMoeda, IconeDoBanco } from '../../shared'

export type Saldo = { valor: number; em: string; informado: boolean; antesDoHistorico: number | null }

/** O saldo da conta no Inter. Quando o banco não informou, é a soma do que foi importado, e o título avisa. */
export function SaldoDaConta({ saldo }: { saldo: Saldo }) {
  return (
    <section aria-label="Saldo da conta" className="flex items-center gap-4 rounded-2xl border border-borda bg-superficie p-6">
      <IconeDoBanco banco="Inter" />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-sm text-texto-suave">{saldo.informado ? 'Saldo da conta' : 'Saldo estimado'} · Inter</h2>
        <span className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">{formatarMoeda(saldo.valor)}</span>
      </div>
    </section>
  )
}

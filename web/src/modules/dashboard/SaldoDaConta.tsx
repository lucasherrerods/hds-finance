import { formatarData, formatarMoeda, IconeDoInter } from '../../shared'

export type Saldo = { valor: number; em: string; informado: boolean; antesDoHistorico: number | null }

/** O saldo da conta no Inter, com a origem dele e o aviso de quando faltam extratos. */
export function SaldoDaConta({ saldo }: { saldo: Saldo }) {
  const faltam = saldo.antesDoHistorico !== null && saldo.antesDoHistorico !== 0
  return (
    <section aria-label="Saldo da conta" className="flex items-center gap-4 rounded-2xl border border-borda bg-superficie p-6">
      <IconeDoInter />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-sm text-texto-suave">Saldo da conta · Inter</h2>
        <span className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">{formatarMoeda(saldo.valor)}</span>
        <span className="text-sm text-texto-suave">
          {saldo.informado ? `Informado pelo banco em ${formatarData(saldo.em)}` : `Soma do que foi importado até ${formatarData(saldo.em)}`}
        </span>
        {faltam && (
          <span className="text-sm text-texto-suave">
            {formatarMoeda(saldo.antesDoHistorico!)} não vêm dos extratos incluídos: faltam períodos ou algo foi apagado.
          </span>
        )}
      </div>
    </section>
  )
}

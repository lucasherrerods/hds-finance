import { CircleCheck, CircleHelp } from 'lucide-react'

/** Nulo quando não dá para saber se foi paga; aí não aparece nada. */
export function Situacao({ paga }: { paga: boolean | null }) {
  if (paga === null) return null
  const Icone = paga ? CircleCheck : CircleHelp
  return (
    <span className={`flex items-center gap-1 text-sm ${paga ? 'text-entrada' : 'text-texto-suave'}`}>
      <Icone aria-hidden className="size-4 opacity-80" />
      {paga ? 'Paga' : 'Pagamento não encontrado'}
    </span>
  )
}

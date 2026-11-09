import { ShieldCheck } from 'lucide-react'

export function AvisoDePrivacidade() {
  return (
    <p className="flex items-center gap-2 text-texto-suave">
      <ShieldCheck aria-hidden className="size-4 shrink-0 opacity-70" />
      Nada é armazenado. O arquivo é lido em memória e some assim que o resumo aparece.
    </p>
  )
}

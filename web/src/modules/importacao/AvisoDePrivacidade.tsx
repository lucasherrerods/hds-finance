import { ShieldCheck } from 'lucide-react'

export function AvisoDePrivacidade() {
  return (
    <p className="flex items-center gap-2 text-texto-suave">
      <ShieldCheck aria-hidden className="size-4 opacity-70" />
      Nada é armazenado: o extrato é processado em memória e descartado ao fim da requisição.
    </p>
  )
}
